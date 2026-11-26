// State Store
  const state = {
    width: 2400,
    height: 2400,
    depth: 600,
    type: 'hinged', // 'hinged' | 'sliding'
    doorsOpen: false,
    doorsHidden: false,
    carcassMaterial: 'oak', // 'oak', 'walnut', 'linen'
    doorFinish: 'cashmere', // 'cashmere', 'fluted', 'umber'
    cameraPreset: 'persp',
    bays: 3
  };

  // DOM Elements
  const container = document.getElementById('three-canvas-container');
  const sliderWidth = document.getElementById('slider-width');
  const inputWidth = document.getElementById('input-width');
  const sliderHeight = document.getElementById('slider-height');
  const inputHeight = document.getElementById('input-height');
  const sliderDepth = document.getElementById('slider-depth');
  const inputDepth = document.getElementById('input-depth');

  const labelWidthOverlay = document.getElementById('label-width-overlay');
  const labelHeightOverlay = document.getElementById('label-height-overlay');
  const labelDepthOverlay = document.getElementById('label-depth-overlay');
  const bayBadge = document.getElementById('bay-badge');
  const bayWidthSummary = document.getElementById('calculated-bay-width-summary');
  const bay1Label = document.getElementById('bay1-width-label');
  const bay2Label = document.getElementById('bay2-width-label');
  const bay3Label = document.getElementById('bay3-width-label');

  const btnToggleDoors = document.getElementById('btn-toggle-doors');
  const doorActionText = document.getElementById('door-action-text');
  const btnInspectInterior = document.getElementById('btn-inspect-interior');
  const btnSnapshot = document.getElementById('btn-snapshot');

  // Tabs
  const tabStructureBtn = document.getElementById('tab-structure-btn');
  const tabMaterialsBtn = document.getElementById('tab-materials-btn');
  const tabCopilotBtn = document.getElementById('tab-copilot-btn');
  const tabStructureContent = document.getElementById('tab-structure-content');
  const tabMaterialsContent = document.getElementById('tab-materials-content');
  const tabCopilotContent = document.getElementById('tab-copilot-content');

  // Typology Switchers
  const typeHingedBtn = document.getElementById('type-hinged');
  const typeSlidingBtn = document.getElementById('type-sliding');

  // Setup Three.js Scene Variables
  let scene, camera, renderer, controls;
  let wardrobeGroup;
  let doorPivots = [];
  let carcassMaterials = {};
  let doorMaterials = {};

  function initThree() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf6f0e8); // Sahara surface-container-low

    const rect = container.getBoundingClientRect();
    const aspect = rect.width / rect.height;
    camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 1000);
    camera.position.set(2.8, 2.0, 3.8);

    renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(rect.width, rect.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.02; // Restrict looking under ground
    controls.minDistance = 1.8;
    controls.maxDistance = 7.0;
    controls.target.set(0, 1.2, 0);

    // Subtle Sahara Ambient Warm Lighting
    const ambientLight = new THREE.AmbientLight(0xfffaea, 0.9);
    scene.add(ambientLight);

    // Warm Directional Sunlight
    const dirLight = new THREE.DirectionalLight(0xfff3e3, 1.4);
    dirLight.position.set(3, 5, 4);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 12;
    dirLight.shadow.bias = -0.0004;
    const d = 2.5;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    scene.add(dirLight);

    // Soft Rim Light for Edge Pop
    const rimLight = new THREE.DirectionalLight(0xc2652a, 0.35);
    rimLight.position.set(-4, 3, -3);
    scene.add(rimLight);

    // Ground Plane with Warm Drop Shadow
    const floorGeo = new THREE.PlaneGeometry(16, 16);
    const floorMat = new THREE.ShadowMaterial({ opacity: 0.12 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    scene.add(floor);

    // Create Material Palette
    initMaterials();

    // Build Wardrobe Geometry
    buildWardrobe();

    // Raycaster for door click interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    container.addEventListener('pointerdown', (e) => {
      const bound = container.getBoundingClientRect();
      mouse.x = ((e.clientX - bound.left) / bound.width) * 2 - 1;
      mouse.y = -((e.clientY - bound.top) / bound.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      const intersects = raycaster.intersectObjects(wardrobeGroup.children, true);
      let clickedDoor = false;
      for (let hit of intersects) {
        if (hit.object.userData && hit.object.userData.isDoor) {
          toggleDoors();
          clickedDoor = true;
          break;
        }
      }
    });

    window.addEventListener('resize', onWindowResize);
    animate();
  }

  function initMaterials() {
    // Carcass Materials
    carcassMaterials.oak = new THREE.MeshStandardMaterial({
      color: 0xb58c65,
      roughness: 0.65,
      metalness: 0.05
    });

    carcassMaterials.walnut = new THREE.MeshStandardMaterial({
      color: 0x4e3a2e,
      roughness: 0.6,
      metalness: 0.05
    });

    carcassMaterials.linen = new THREE.MeshStandardMaterial({
      color: 0xdcd3c4,
      roughness: 0.85,
      metalness: 0.02
    });

    // Door Materials
    doorMaterials.cashmere = new THREE.MeshStandardMaterial({
      color: 0xe5ded4,
      roughness: 0.45,
      metalness: 0.04
    });

    doorMaterials.fluted = new THREE.MeshStandardMaterial({
      color: 0xa9825b,
      roughness: 0.6,
      metalness: 0.05
    });

    doorMaterials.umber = new THREE.MeshStandardMaterial({
      color: 0x3d332d,
      roughness: 0.7,
      metalness: 0.08
    });

    // Handle material
    doorMaterials.brass = new THREE.MeshStandardMaterial({
      color: 0xce9e58,
      roughness: 0.32,
      metalness: 0.82
    });

    // Hanging rail
    doorMaterials.rail = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      roughness: 0.2,
      metalness: 0.95
    });
  }

  function buildWardrobe() {
    if (wardrobeGroup) {
      scene.remove(wardrobeGroup);
      wardrobeGroup.traverse(child => {
        if (child.geometry) child.geometry.dispose();
      });
    }

    wardrobeGroup = new THREE.Group();
    doorPivots = [];

    const W = state.width / 1000;
    const H = state.height / 1000;
    const D = state.depth / 1000;
    const t = 0.019; // 19mm panel thickness
    const plinthH = 0.08; // 80mm kickplate

    const currentCarcassMat = carcassMaterials[state.carcassMaterial];
    const currentDoorMat = doorMaterials[state.doorFinish];

    // 1. Plinth (Base Kickplate)
    const plinthGeo = new THREE.BoxGeometry(W - 0.04, plinthH, D - 0.05);
    const plinth = new THREE.Mesh(plinthGeo, currentCarcassMat);
    plinth.position.set(0, plinthH / 2, -0.015);
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    wardrobeGroup.add(plinth);

    const interiorH = H - plinthH - t * 2;
    const interiorYCenter = plinthH + t + interiorH / 2;

    // 2. Bottom & Top Panels
    const bottomGeo = new THREE.BoxGeometry(W, t, D);
    const bottom = new THREE.Mesh(bottomGeo, currentCarcassMat);
    bottom.position.set(0, plinthH + t / 2, 0);
    bottom.castShadow = true;
    bottom.receiveShadow = true;
    wardrobeGroup.add(bottom);

    const top = new THREE.Mesh(bottomGeo, currentCarcassMat);
    top.position.set(0, H - t / 2, 0);
    top.castShadow = true;
    wardrobeGroup.add(top);

    // 3. Side Gables (Left & Right Exterior Walls)
    const gableGeo = new THREE.BoxGeometry(t, H - plinthH, D);
    const leftGable = new THREE.Mesh(gableGeo, currentCarcassMat);
    leftGable.position.set(-W / 2 + t / 2, plinthH + (H - plinthH) / 2, 0);
    leftGable.castShadow = true;
    leftGable.receiveShadow = true;
    wardrobeGroup.add(leftGable);

    const rightGable = new THREE.Mesh(gableGeo, currentCarcassMat);
    rightGable.position.set(W / 2 - t / 2, plinthH + (H - plinthH) / 2, 0);
    rightGable.castShadow = true;
    rightGable.receiveShadow = true;
    wardrobeGroup.add(rightGable);

    // 4. Back Panel (8mm recessed)
    const backGeo = new THREE.BoxGeometry(W - t * 2, interiorH, 0.008);
    const backMat = currentCarcassMat;
    const back = new THREE.Mesh(backGeo, backMat);
    back.position.set(0, interiorYCenter, -D / 2 + 0.008);
    back.receiveShadow = true;
    wardrobeGroup.add(back);

    // 5. Internal Vertical Dividers (Bays)
    const bayCount = state.bays;
    const bayInternalWidth = (W - t * (bayCount + 1)) / bayCount;

    for (let i = 1; i < bayCount; i++) {
      const divider = new THREE.Mesh(new THREE.BoxGeometry(t, interiorH, D - 0.02), currentCarcassMat);
      const xPos = -W / 2 + t + i * (bayInternalWidth + t) - t / 2;
      divider.position.set(xPos, interiorYCenter, -0.01);
      divider.castShadow = true;
      divider.receiveShadow = true;
      wardrobeGroup.add(divider);
    }

    // 6. Internal Bay Custom Joinery Elements
    for (let i = 0; i < bayCount; i++) {
      const bayCenterX = -W / 2 + t + bayInternalWidth / 2 + i * (bayInternalWidth + t);

      if (i === 0) {
        // Bay 1: Shelving stack + Low Hanging Rail
        const shelfCount = 4;
        for (let s = 1; s <= shelfCount; s++) {
          const shelf = new THREE.Mesh(new THREE.BoxGeometry(bayInternalWidth, t, D - 0.04), currentCarcassMat);
          const y = plinthH + t + (interiorH / (shelfCount + 1)) * s;
          shelf.position.set(bayCenterX, y, -0.01);
          shelf.castShadow = true;
          shelf.receiveShadow = true;
          wardrobeGroup.add(shelf);
        }
      } else if (i === 1) {
        // Bay 2: Double Hanging with Mid-shelf
        const midShelf = new THREE.Mesh(new THREE.BoxGeometry(bayInternalWidth, t, D - 0.04), currentCarcassMat);
        midShelf.position.set(bayCenterX, interiorYCenter, -0.01);
        midShelf.castShadow = true;
        wardrobeGroup.add(midShelf);

        // Upper Rail
        const railTop = createHangingRail(bayInternalWidth);
        railTop.position.set(bayCenterX, H - 0.12, -0.02);
        wardrobeGroup.add(railTop);

        // Lower Rail
        const railBottom = createHangingRail(bayInternalWidth);
        railBottom.position.set(bayCenterX, interiorYCenter - 0.12, -0.02);
        wardrobeGroup.add(railBottom);

        // 3D Hanger representations
        for (let h = -2; h <= 2; h++) {
          const hanger = createSimpleHanger();
          hanger.position.set(bayCenterX + h * 0.1, H - 0.13, -0.02);
          wardrobeGroup.add(hanger);
        }
      } else {
        // Bay 3: High Hat Shelf + Full Length Hanging
        const topShelf = new THREE.Mesh(new THREE.BoxGeometry(bayInternalWidth, t, D - 0.04), currentCarcassMat);
        topShelf.position.set(bayCenterX, H - 0.35, -0.01);
        topShelf.castShadow = true;
        wardrobeGroup.add(topShelf);

        const longRail = createHangingRail(bayInternalWidth);
        longRail.position.set(bayCenterX, H - 0.42, -0.02);
        wardrobeGroup.add(longRail);

        // Integrated shoe drawer at base
        const drawerGeo = new THREE.BoxGeometry(bayInternalWidth - 0.02, 0.22, D - 0.05);
        const drawer = new THREE.Mesh(drawerGeo, currentCarcassMat);
        drawer.position.set(bayCenterX, plinthH + t + 0.11, -0.01);
        drawer.castShadow = true;
        wardrobeGroup.add(drawer);
      }
    }

    // 7. Hinged Doors & Edge-Pull Handles
    const numDoors = 4;
    const doorWidth = (W - 0.006) / numDoors;
    const doorHeight = H - plinthH - 0.01;
    const doorThickness = 0.02;

    for (let dIdx = 0; dIdx < numDoors; dIdx++) {
      const isLeftHinge = dIdx % 2 === 0;
      const pivot = new THREE.Group();

      // Calculate door position along front facade
      const doorStartX = -W / 2 + 0.003 + dIdx * doorWidth;
      const hingeX = isLeftHinge ? doorStartX : doorStartX + doorWidth;
      const hingeZ = D / 2 + doorThickness / 2;

      pivot.position.set(hingeX, plinthH + doorHeight / 2, hingeZ);

      // Door Leaf mesh
      const leafGeo = new THREE.BoxGeometry(doorWidth - 0.003, doorHeight, doorThickness);
      const doorMesh = new THREE.Mesh(leafGeo, currentDoorMat);
      doorMesh.castShadow = true;
      doorMesh.receiveShadow = true;
      doorMesh.userData = { isDoor: true, doorIdx: dIdx };

      // Offset relative to hinge pivot
      const leafOffsetX = isLeftHinge ? (doorWidth / 2) : -(doorWidth / 2);
      doorMesh.position.set(leafOffsetX, 0, 0);
      pivot.add(doorMesh);

      // Slim Brass Edge Handle (300mm)
      const handleGeo = new THREE.BoxGeometry(0.012, 0.32, 0.025);
      const handle = new THREE.Mesh(handleGeo, doorMaterials.brass);
      const handleX = isLeftHinge ? doorWidth - 0.03 : -(doorWidth - 0.03);
      handle.position.set(handleX, 0, doorThickness / 2 + 0.012);
      handle.castShadow = true;
      pivot.add(handle);

      pivot.userData = {
        isLeftHinge: isLeftHinge,
        openAngle: isLeftHinge ? -Math.PI * 0.58 : Math.PI * 0.58,
        closedAngle: 0
      };

      doorPivots.push(pivot);
      wardrobeGroup.add(pivot);
    }

    scene.add(wardrobeGroup);

    // Update target for smooth orbit
    controls.target.set(0, H / 2, 0);

    // Apply visibility states if toggled
    if (state.doorsHidden) {
      setDoorsVisibility(false);
    } else if (state.doorsOpen) {
      applyDoorAngles(1);
    }
  }

  function createHangingRail(length) {
    const railGeo = new THREE.CylinderGeometry(0.012, 0.012, length - 0.03, 16);
    const rail = new THREE.Mesh(railGeo, doorMaterials.rail);
    rail.rotation.z = Math.PI / 2;
    rail.castShadow = true;
    return rail;
  }

  function createSimpleHanger() {
    const hangerGroup = new THREE.Group();
    const barGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.28, 8);
    const bar = new THREE.Mesh(barGeo, doorMaterials.oak);
    bar.rotation.z = Math.PI / 2;
    bar.castShadow = true;
    hangerGroup.add(bar);
    return hangerGroup;
  }

  function toggleDoors() {
    state.doorsOpen = !state.doorsOpen;
    doorActionText.textContent = state.doorsOpen ? 'Close Doors' : 'Open Doors';
    animateDoorPivots(state.doorsOpen);
  }

  function animateDoorPivots(open) {
    doorPivots.forEach(pivot => {
      const targetAngle = open ? pivot.userData.openAngle : pivot.userData.closedAngle;
      new TWEEN.Tween(pivot.rotation)
        .to({ y: targetAngle }, 850)
        .easing(TWEEN.Easing.Cubic.Out)
        .start();
    });
  }

  function applyDoorAngles(progress) {
    doorPivots.forEach(pivot => {
      pivot.rotation.y = progress ? pivot.userData.openAngle : pivot.userData.closedAngle;
    });
  }

  function setDoorsVisibility(visible) {
    doorPivots.forEach(p => {
      p.visible = visible;
    });
  }

  // Camera presets
  function setCameraPreset(mode) {
    const H = state.height / 1000;
    const target = new THREE.Vector3(0, H / 2, 0);

    let endPos = new THREE.Vector3();
    if (mode === 'persp') {
      endPos.set(2.8, H * 0.85, 3.8);
    } else if (mode === 'front') {
      endPos.set(0, H / 2, 4.4);
    } else if (mode === 'bays') {
      endPos.set(0, H / 2, 2.9);
      if (!state.doorsOpen && !state.doorsHidden) toggleDoors();
    } else if (mode === 'iso') {
      endPos.set(3.4, H * 1.3, 3.4);
    }

    new TWEEN.Tween(camera.position)
      .to({ x: endPos.x, y: endPos.y, z: endPos.z }, 900)
      .easing(TWEEN.Easing.Cubic.Out)
      .start();

    new TWEEN.Tween(controls.target)
      .to({ x: target.x, y: target.y, z: target.z }, 900)
      .easing(TWEEN.Easing.Cubic.Out)
      .start();
  }

  function updateDimensions() {
    // Sync slider & direct inputs
    sliderWidth.value = state.width;
    inputWidth.value = state.width;
    sliderHeight.value = state.height;
    inputHeight.value = state.height;
    sliderDepth.value = state.depth;
    inputDepth.value = state.depth;

    // Overlays
    const bayW = Math.round(state.width / state.bays);
    labelWidthOverlay.textContent = `${state.width} mm`;
    labelHeightOverlay.textContent = `${state.height} mm`;
    labelDepthOverlay.textContent = `${state.depth} mm`;
    bayWidthSummary.textContent = `${state.bays} Bays @ ${bayW} mm each`;
    bayBadge.textContent = `${state.bays} Equal Bays (${bayW}mm)`;
    bay1Label.textContent = `${bayW}mm`;
    bay2Label.textContent = `${bayW}mm`;
    bay3Label.textContent = `${bayW}mm`;

    // Rebuild 3D Model
    buildWardrobe();
  }

  function stepDimension(type, delta) {
    const limits = { width: [1200, 3600], height: [1800, 2800], depth: [450, 750] };
    const [lo, hi] = limits[type];
    state[type] = Math.min(hi, Math.max(lo, state[type] + delta));
    updateDimensions();
  }

  document.querySelectorAll('[data-step-dim]').forEach(btn => {
    btn.addEventListener('click', () => stepDimension(btn.dataset.stepDim, Number(btn.dataset.step)));
  });

  const carcassTitles = { oak: 'Example Oak finish', walnut: 'Example Walnut finish', linen: 'Example Linen finish' };
  document.querySelectorAll('[data-carcass]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.carcass;
      state.carcassMaterial = key;
      document.getElementById('selected-carcass-title').textContent = carcassTitles[key];
      document.querySelectorAll('[data-carcass]').forEach(b => b.classList.toggle('ring-2', b === btn));
      document.querySelectorAll('[data-carcass]').forEach(b => b.classList.toggle('ring-primary', b === btn));
      buildWardrobe();
    });
  });

  const doorTitles = { cashmere: 'Example light finish', fluted: 'Example fluted finish', umber: 'Example dark finish' };
  document.querySelectorAll('input[name="door-finish"]').forEach(radio => {
    radio.addEventListener('change', () => {
      state.doorFinish = radio.value;
      document.getElementById('selected-door-title').textContent = doorTitles[radio.value];
      buildWardrobe();
    });
  });

  // Event Listeners for inputs
  sliderWidth.addEventListener('input', (e) => { state.width = parseInt(e.target.value); updateDimensions(); });
  inputWidth.addEventListener('change', (e) => { state.width = Math.min(3600, Math.max(1200, parseInt(e.target.value) || 2400)); updateDimensions(); });

  sliderHeight.addEventListener('input', (e) => { state.height = parseInt(e.target.value); updateDimensions(); });
  inputHeight.addEventListener('change', (e) => { state.height = Math.min(2800, Math.max(1800, parseInt(e.target.value) || 2400)); updateDimensions(); });

  sliderDepth.addEventListener('input', (e) => { state.depth = parseInt(e.target.value); updateDimensions(); });
  inputDepth.addEventListener('change', (e) => { state.depth = Math.min(750, Math.max(450, parseInt(e.target.value) || 600)); updateDimensions(); });

  btnToggleDoors.addEventListener('click', toggleDoors);

  btnInspectInterior.addEventListener('click', () => {
    state.doorsHidden = !state.doorsHidden;
    setDoorsVisibility(!state.doorsHidden);
    btnInspectInterior.classList.toggle('bg-primary', state.doorsHidden);
    btnInspectInterior.classList.toggle('text-on-primary', state.doorsHidden);
  });

  // Snapshot functionality
  btnSnapshot.addEventListener('click', () => {
    renderer.render(scene, camera);
    const dataURL = renderer.domElement.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `atelier-wardrobe-elevation-${Date.now()}.png`;
    link.href = dataURL;
    link.click();
  });

  // Camera presets buttons
  document.getElementById('cam-persp').addEventListener('click', () => setCameraPreset('persp'));
  document.getElementById('cam-front').addEventListener('click', () => setCameraPreset('front'));
  document.getElementById('cam-bays').addEventListener('click', () => setCameraPreset('bays'));
  document.getElementById('cam-iso').addEventListener('click', () => setCameraPreset('iso'));

  // Tab switching
  function switchTab(active) {
    const tabs = ['structure', 'materials', 'copilot'];
    tabs.forEach(tab => {
      const btn = document.getElementById(`tab-${tab}-btn`);
      const content = document.getElementById(`tab-${tab}-content`);
      if (tab === active) {
        btn.classList.add('bg-surface-container-lowest', 'text-on-surface', 'font-semibold', 'shadow-sm');
        btn.classList.remove('text-on-surface-variant');
        content.classList.remove('hidden');
        content.classList.add('flex');
      } else {
        btn.classList.remove('bg-surface-container-lowest', 'text-on-surface', 'font-semibold', 'shadow-sm');
        btn.classList.add('text-on-surface-variant');
        content.classList.add('hidden');
        content.classList.remove('flex');
      }
    });
  }

  tabStructureBtn.addEventListener('click', () => switchTab('structure'));
  tabMaterialsBtn.addEventListener('click', () => switchTab('materials'));
  tabCopilotBtn.addEventListener('click', () => switchTab('copilot'));

  // Typology Switchers
  typeHingedBtn.addEventListener('click', () => {
    typeHingedBtn.classList.add('bg-surface-container-high', 'text-on-surface', 'font-semibold');
    typeHingedBtn.classList.remove('text-on-surface-variant');
    typeSlidingBtn.classList.remove('bg-surface-container-high', 'text-on-surface', 'font-semibold');
    typeSlidingBtn.classList.add('text-on-surface-variant');
    state.type = 'hinged';
    buildWardrobe();
  });

  typeSlidingBtn.addEventListener('click', () => {
    typeSlidingBtn.classList.add('bg-surface-container-high', 'text-on-surface', 'font-semibold');
    typeSlidingBtn.classList.remove('text-on-surface-variant');
    typeHingedBtn.classList.remove('bg-surface-container-high', 'text-on-surface', 'font-semibold');
    typeHingedBtn.classList.add('text-on-surface-variant');
    state.type = 'sliding';
    buildWardrobe();
  });

  function onWindowResize() {
    const rect = container.getBoundingClientRect();
    camera.aspect = rect.width / rect.height;
    camera.updateProjectionMatrix();
    renderer.setSize(rect.width, rect.height);
  }

  function animate(time) {
    requestAnimationFrame(animate);
    TWEEN.update();
    controls.update();
    renderer.render(scene, camera);
  }

  // Initialize on load
  initThree();
