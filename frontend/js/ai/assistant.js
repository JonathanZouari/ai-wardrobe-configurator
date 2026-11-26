// Design assistant panel: talk (GPT-Live over WebRTC, client delegation) or type.
// Either way the request goes to our backend agent, which returns a validated proposal.
// Nothing changes until the customer presses Accept; an accepted change can be undone.
import { proposeChanges, startVoiceSession } from '../api/client.js';
import { applyDraftOperations, ensureDraft, loadDraft, restoreDraft } from '../state/draft.js';

const ICE_TIMEOUT_MS = 10000;
const CLOSE_TIMEOUT_MS = 3000;
const CONVERSATION_LIMIT = 3500; // the backend accepts up to 4000 characters

function el(tag, className = '', text = '') {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
}

function button(label, className) {
  const node = el('button', className, label);
  node.type = 'button';
  return node;
}

export function mountAssistant({ onApplied }) {
  // ---------- conversation memory ----------
  let lines = [];
  let pending = { speaker: null, text: '' };

  function flush() {
    if (pending.text.trim()) lines = [...lines, `${pending.speaker}: ${pending.text.trim()}`];
    pending = { speaker: null, text: '' };
  }
  function hear(speaker, delta) {
    if (pending.speaker !== speaker) flush();
    pending = { speaker, text: pending.text + delta };
    showTranscript();
  }
  function conversation() {
    const all = [...lines, pending.text.trim() ? `${pending.speaker}: ${pending.text.trim()}` : ''].filter(Boolean).join('\n');
    return all.slice(-CONVERSATION_LIMIT);
  }

  // ---------- panel ----------
  const PRIMARY = 'px-3 py-2 text-xs font-label font-semibold bg-primary text-on-primary rounded-lg hover:bg-primary/90';
  const QUIET = 'px-3 py-2 text-xs font-label bg-surface-container hover:bg-surface-container-high text-on-surface rounded-lg';

  const panel = el('section', 'fixed bottom-4 left-4 z-50 w-80 max-w-[calc(100vw-2rem)] bg-surface-container-lowest rounded-xl shadow-xl p-4 flex flex-col gap-3 text-on-surface');
  panel.setAttribute('aria-label', 'Design assistant');
  const status = el('p', 'text-[11px] text-on-surface-variant min-h-[1rem]');
  status.dir = 'auto';
  status.setAttribute('role', 'status');
  const transcript = el('p', 'text-xs text-on-surface-variant max-h-24 overflow-y-auto whitespace-pre-line');
  transcript.dir = 'auto'; // Hebrew or English, whichever the conversation is in
  const card = el('div', 'bg-surface-container-low rounded-lg p-3 flex flex-col gap-2');
  card.hidden = true;
  const talk = button('Start talking', PRIMARY);
  const form = el('form', 'flex gap-2');
  const input = el('input', 'flex-1 min-w-0 px-2.5 py-2 text-xs bg-surface-container rounded-lg text-on-surface focus:outline-none focus:ring-1 focus:ring-primary');
  Object.assign(input, { type: 'text', placeholder: 'Or type a request (English or Hebrew)', maxLength: 300, dir: 'auto' });
  input.setAttribute('aria-label', 'Request for the design assistant');
  const send = button('Send', QUIET);
  send.type = 'submit';
  form.append(input, send);
  panel.append(el('h2', 'font-headline text-lg', 'Design assistant'), status, transcript, card, talk, form);
  document.body.append(panel);

  const say = (message) => { status.textContent = message; };
  function showTranscript() {
    transcript.textContent = conversation().split('\n').slice(-4).join('\n');
    transcript.scrollTop = transcript.scrollHeight;
  }

  // ---------- proposals ----------
  function showProposal(proposal) {
    const list = el('ul', 'list-disc ps-4 text-xs text-on-surface');
    proposal.changes.forEach((change) => list.append(el('li', '', change)));
    const accept = button('Accept', PRIMARY);
    const reject = button('Reject', QUIET);
    const actions = el('div', 'flex gap-2');
    actions.append(accept, reject);
    card.replaceChildren(el('p', 'text-[11px] font-label uppercase tracking-widest text-primary font-semibold', 'Proposed change'), list, actions);
    card.hidden = false;

    reject.addEventListener('click', () => {
      card.hidden = true;
      input.focus(); // the focused button just disappeared
      say('Proposal rejected. Your design was not changed.');
      tellVoice('The customer rejected the proposal. The design was not changed.');
    });
    accept.addEventListener('click', async () => {
      const before = loadDraft();
      if (before?.revision !== proposal.base_revision) {
        card.hidden = true;
        say('The design changed since this proposal. Please ask again.');
        return;
      }
      try {
        onApplied(await applyDraftOperations(proposal.operations));
      } catch (error) {
        say(`Could not apply the proposal: ${error.message}`);
        return;
      }
      const undo = button('Undo', QUIET);
      undo.addEventListener('click', () => {
        onApplied(restoreDraft(before));
        card.hidden = true;
        input.focus();
        say('Change undone.');
        tellVoice('The customer undid the change. The design is back to how it was.');
      });
      card.replaceChildren(el('p', 'text-xs text-on-surface', 'Proposal applied. You can undo this change.'), undo);
      undo.focus();
      say('Proposal applied. You can undo this change.');
      tellVoice('The customer accepted the proposal and it has been applied.');
    });
  }

  // Asks our backend agent. Returns the sentence to say back.
  async function requestProposal() {
    card.hidden = true;
    say('Preparing a proposal…');
    try {
      const proposal = await proposeChanges(await ensureDraft(), conversation());
      if (proposal.operations.length) showProposal(proposal);
      say(proposal.operations.length ? `${proposal.reply} Review the proposed change below.` : proposal.reply);
      return proposal.reply;
    } catch (error) {
      say(`The assistant could not answer: ${error.message}`);
      return 'I could not prepare that change. Please try again.';
    }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    flush();
    lines = [...lines, `Customer: ${text}`];
    showTranscript();
    const reply = await requestProposal();
    lines = [...lines, `Assistant: ${reply}`];
    showTranscript();
  });

  // ---------- voice (GPT-Live, client delegation) ----------
  let call = null; // { connection, channel, stream, audio }

  const sendEvent = (event) => {
    if (call?.channel.readyState === 'open') call.channel.send(JSON.stringify({ event_id: crypto.randomUUID(), ...event }));
  };
  const tellVoice = (content) => sendEvent({ type: 'session.instructions.append', delegation_id: null, content });

  async function onVoiceEvent(message) {
    const event = JSON.parse(message.data);
    switch (event.type) {
      case 'session.started':
        say('Listening. Speak in English or Hebrew.');
        break;
      case 'session.input_transcript.delta':
        hear('Customer', event.delta ?? '');
        break;
      case 'session.output_transcript.delta':
        hear('Assistant', event.delta ?? '');
        break;
      case 'session.delegation.created': {
        // The voice model handed the request to us: answer with our own agent's proposal.
        const delegationId = event.delegation.id;
        const content = await requestProposal();
        sendEvent({ type: 'session.commentary.append', delegation_id: delegationId, content });
        break;
      }
      case 'error':
        say(`Voice error: ${event.error?.message ?? event.message ?? 'unknown error'}`);
        break;
      default:
        break;
    }
  }

  function iceGathered(connection) {
    if (connection.iceGatheringState === 'complete') return Promise.resolve();
    return new Promise((resolve) => {
      const timer = setTimeout(resolve, ICE_TIMEOUT_MS);
      connection.addEventListener('icegatheringstatechange', () => {
        if (connection.iceGatheringState === 'complete') { clearTimeout(timer); resolve(); }
      });
    });
  }

  function hangUp() {
    if (!call) return;
    const { connection, stream, audio } = call;
    call = null;
    stream.getTracks().forEach((track) => track.stop());
    connection.close();
    audio.srcObject = null;
    flush();
    talk.textContent = 'Start talking';
    say('Voice session ended.');
  }

  async function startCall() {
    if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) {
      say('This browser cannot use the microphone here. You can type your request instead.');
      return;
    }
    talk.disabled = true;
    say('Connecting…');
    let stream = null;
    let connection = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      connection = new RTCPeerConnection();
      const audio = new Audio();
      audio.autoplay = true;
      connection.addEventListener('track', (event) => { audio.srcObject = event.streams[0]; });
      stream.getTracks().forEach((track) => connection.addTrack(track, stream));
      const channel = connection.createDataChannel('oai-events'); // must exist before the offer
      channel.addEventListener('message', onVoiceEvent);
      connection.addEventListener('connectionstatechange', () => {
        if (['failed', 'disconnected', 'closed'].includes(connection.connectionState)) hangUp();
      });
      await connection.setLocalDescription(await connection.createOffer());
      await iceGathered(connection);
      const answer = await startVoiceSession(connection.localDescription.sdp);
      await connection.setRemoteDescription({ type: 'answer', sdp: answer.sdp });
      call = { connection, channel, stream, audio };
      talk.textContent = 'Stop talking';
    } catch (error) {
      stream?.getTracks().forEach((track) => track.stop());
      connection?.close();
      say(error.name === 'NotAllowedError' ? 'Microphone access was not allowed. You can type your request instead.' : `Could not start the voice session: ${error.message}`);
    } finally {
      talk.disabled = false;
    }
  }

  talk.addEventListener('click', () => {
    if (!call) { startCall(); return; }
    sendEvent({ type: 'session.close' });
    setTimeout(hangUp, CLOSE_TIMEOUT_MS); // give the session a moment to close cleanly
    say('Ending the voice session…');
  });
  window.addEventListener('pagehide', hangUp);
}
