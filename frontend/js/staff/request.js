(function() {
      const toggleDoorsBtn = document.getElementById('btn-toggle-doors');
      const hideDoorsBtn = document.getElementById('btn-hide-doors');
      const toggleLabel = document.getElementById('label-toggle-doors');
      const doors = [
        document.getElementById('door-panel-1'),
        document.getElementById('door-panel-2'),
        document.getElementById('door-panel-3'),
        document.getElementById('door-panel-4')
      ];
      const drawersHint = document.getElementById('internal-drawers-hint');
      
      let doorsOpen = false;
      let doorsHidden = false;

      if (toggleDoorsBtn) {
        toggleDoorsBtn.addEventListener('click', () => {
          doorsOpen = !doorsOpen;
          if (doorsOpen) {
            doors[0].style.transform = 'skewY(4deg) scaleX(0.35)';
            doors[1].style.transform = 'skewY(-4deg) scaleX(0.35)';
            doors[2].style.transform = 'skewY(4deg) scaleX(0.35)';
            doors[3].style.transform = 'skewY(-4deg) scaleX(0.35)';
            drawersHint.classList.remove('opacity-0');
            toggleLabel.textContent = 'Close doors';
          } else {
            doors.forEach(d => d.style.transform = 'none');
            drawersHint.classList.add('opacity-0');
            toggleLabel.textContent = 'Open doors';
          }
        });
      }

      if (hideDoorsBtn) {
        hideDoorsBtn.addEventListener('click', () => {
          doorsHidden = !doorsHidden;
          doors.forEach(d => {
            d.style.opacity = doorsHidden ? '0.15' : '1';
          });
          drawersHint.classList.toggle('opacity-0', !doorsHidden);
        });
      }

      const saveBtn = document.getElementById('btn-save-version');
      if (saveBtn) {
        saveBtn.addEventListener('click', () => {
          document.getElementById('save-status').textContent = 'Draft saved (example, not persisted). The original customer version is unchanged.';
        });
      }

      const noteForm = document.getElementById('note-form');
      const noteInput = document.getElementById('note-input');
      const noteList = document.getElementById('note-list');
      const noteStatus = document.getElementById('note-status');
      if (noteForm && noteInput && noteList) {
        noteForm.addEventListener('submit', (e) => {
          e.preventDefault();
          const val = noteInput.value.trim();
          if (!val) return;
          const note = document.createElement('div');
          note.className = 'p-3 bg-surface-container-low rounded-lg text-xs text-on-surface leading-relaxed';
          note.textContent = val;
          noteList.append(note);
          noteInput.value = '';
          noteStatus.textContent = 'Note added to this page only (example, not persisted).';
        });
      }
    })();
