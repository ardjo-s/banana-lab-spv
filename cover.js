function createCover(element) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  element.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  scene.name = "Couverture";
  const camera = new THREE.PerspectiveCamera(32, 1, .1, 30);
  const key = new THREE.DirectionalLight(0xffdeaa, 2.6);
  key.position.set(-4.2, 5.7, 2.7);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.normalBias = .015;
  Object.assign(key.shadow.camera, { left: -2.8, right: 2.8, top: 2.8, bottom: -2.8 });
  key.shadow.camera.updateProjectionMatrix();
  const rim = new THREE.DirectionalLight(0xffc579, 3.15);
  rim.position.set(4, 3, -4);
  scene.add(key, rim, new THREE.HemisphereLight(0xd2e9ed, 0xab8572, 1.47));

  function box(parent, material, x, y, z, w, h, d) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    mesh.receiveShadow = mesh.castShadow = true;
    parent.add(mesh);
  }

  const timber = new THREE.MeshStandardMaterial({ color: 0x936039, roughness: .83 });
  const boards = new THREE.MeshStandardMaterial({ color: 0xbe8750, roughness: .78 });
  const grain = makeWoodGrain();
  for (const plank of [timber, boards]) {
    plank.map = grain;
    plank.bumpMap = grain;
    plank.bumpScale = .012;
  }
  // A shadow catcher grounds the animated cast in the depot plate.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(18, 16), new THREE.ShadowMaterial({ color: 0x271a0f, opacity: .33, depthWrite: false }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const softContact = paintedSurface(64, 64, ctx => {
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, '#20170de0');
    gradient.addColorStop(.54, '#20170d68');
    gradient.addColorStop(1, '#20170d00');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
  });
  const shadowInk = new THREE.MeshBasicMaterial({ map: softContact, transparent: true, depthWrite: false });
  const contacts = [];
  for (const [x, z, size] of [[-.95, -.08, 1.42], [.18, -.5, 1.42], [1.01, .15, 1.38], [.45, .84, 1.7]]) {
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(size, size * .8), shadowInk);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(x, .006, z);
    scene.add(shadow);
    contacts.push(shadow);
  }
  const crate = new THREE.Group();
  scene.add(crate);
  crate.position.set(.45, 0, .86);
  box(crate, timber, 0, .10, 0, 1.18, .20, .76);
  for (const side of [-1, 1]) {
    for (const y of [.23, .37, .51]) {
      box(crate, boards, 0, y, side * .37, 1.18, .105, .065);
      box(crate, timber, side * .56, y, 0, .065, .105, .76);
    }
  }

  const bunch = new THREE.Group();
  scene.add(bunch);
  const peel = makeFruitSurface();
  const fruit = bananaGeometry();
  for (let i = 0; i < 4; i++) {
    const banana = new THREE.Mesh(fruit, peel);
    banana.position.set(i * .016, i % 2 * .043, (i - 1.5) * .112);
    banana.rotation.set(i * .09, (i - 2) * .15, -.16 + i * .10);
    banana.castShadow = true;
    bunch.add(banana);
  }
  const supply = crate.clone();
  supply.position.set(-1.01, 0, .71);
  supply.rotation.y = -.16;
  scene.add(supply);
  for (const bin of [supply, crate]) {
    const reserve = bunch.clone();
    reserve.position.set(0, .38, -.01);
    reserve.rotation.y = .2;
    bin.add(reserve);
  }
  box(scene, boards, .16, .15, -.54, 1.04, .29, .79);
  const releasePoint = new THREE.Vector3();
  const looseFruit = bunch.children[3].clone();
  scene.add(looseFruit);
  const catchPoint = new THREE.Vector3();
  const [kevin, stuart, bob] = makeMinions(THREE);
  scene.add(kevin.root, stuart.root, bob.root);
  const grip = new THREE.Vector3();
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const button = element.querySelector('button');
  let paused = false;
  let visible = true;
  let frame = 0;
  let seconds = .54;
  let previous;

  function render(now) {
    frame = 0;
    const playing = visible && !document.hidden && !paused && !motion.matches;
    if (playing && previous !== undefined) seconds += Math.min(.05, (now - previous) / 1000);
    previous = playing ? now : undefined;
    const time = motion.matches ? 2.6 : seconds;
    // Pick up, offer, accept, lower, then release below the front slat.
    const beat = time % 6.8;
    const ramp = (a, b) => THREE.MathUtils.smootherstep(beat, a, b);
    const pickup = ramp(.35, 1.62);
    const pass = ramp(1.62, 3.22);
    const lower = ramp(3.34, 4.91);
    const recoil = Math.sin(Math.PI * ramp(3.15, 3.64));
    const weight = Math.sin(Math.PI * ramp(.25, 1.28));
    const x = -.98 + pickup * .24 + pass * 1.04 + lower * .14;
    const y = .43 + pickup * .56 + Math.sin(pass * Math.PI) * .13 - lower * .57;
    bunch.position.set(x, y - recoil * .042, .75 + .10 * pass);
    bunch.rotation.set(.04 + .08 * weight, -.24 + .45 * pass, -.16 + .19 * pickup - .23 * lower + recoil * .10);
    bunch.visible = beat < 5.25;
    bunch.scale.setScalar(.92 * (1 - ramp(4.92, 5.25)));
    const blink = center => Math.max(0, 1 - Math.abs(beat - center) / .115);
    const breath = Math.sin(time * 2.1);
    // A banana rolls off the top. Bob catches it after its apex.
    const slip = ramp(4.22, 5.08);
    const settle = ramp(5.08, 5.84);
    const loose = beat >= 4.22 && beat < 5.9;
    looseFruit.visible = loose;
    bunch.children[3].visible = !loose;
    catchPoint.set(.48 + .53 * slip - .44 * settle,
      .62 + .68 * Math.sin(Math.PI * slip) + .22 * slip - .39 * settle,
      .96 + .045 * Math.sin(Math.PI * slip));
    bunch.children[3].getWorldPosition(releasePoint);
    catchPoint.lerp(releasePoint, 1 - ramp(4.22, 4.39));
    looseFruit.position.copy(catchPoint);
    looseFruit.rotation.set(.18, -.22 + slip * .4, .12 + slip * Math.PI * 1.82 + settle * .26);
    looseFruit.scale.setScalar(.91 * (1 - ramp(5.67, 5.90)));
    const surprise = Math.sin(Math.PI * ramp(4.14, 5.25));
    const kevinGrip = ramp(0, .43) * (1 - ramp(2.78, 3.35));
    const bobGrip = ramp(2.40, 2.85) * (1 - ramp(4.83, 5.32));
    kevin.pose({ x: -.97 + .23 * pass * (1 - ramp(3.35, 4.6)), z: -.06,
      yaw: .13 + .42 * ramp(1.12, 2.72) * (1 - ramp(4.10, 5.75)),
      lean: .23 + .46 * weight - .15 * pass * (1 - lower),
      tilt: -.065 * Math.sin(Math.PI * pass), grip: bunch.position, spread: .25,
      contact: kevinGrip, breath, look: .88 * ramp(1.1, 1.51) - .58 * ramp(4.6, 5.2),
      blink: blink(1.04) + blink(5.54), smile: .55 * pass - surprise * .9 });
    bob.pose({ x: 1.08 - .30 * ramp(2.02, 2.75) + .30 * ramp(4.95, 5.62), z: .17,
      yaw: -.25 - .44 * ramp(1.85, 2.62) + .36 * lower + .08 * ramp(5, 6),
      grip: bunch.position, spread: .22, contact: bobGrip,
      lean: .13 + recoil * .36 + lower * .42 * (1 - ramp(4.92, 5.5)),
      tilt: .07 * recoil - surprise * .105, breath: -breath, look: -.82 + .58 * lower + surprise * .85,
      catchPoint: loose ? catchPoint : null, catchWeight: ramp(4.61, 5.04) * (1 - ramp(5.68, 5.90)),
      blink: blink(3.24) + blink(5.38), smile: recoil + lower * .27 + surprise * .8 });
    grip.copy(crate.position);
    grip.y = .48;
    grip.z -= .27;
    stuart.pose({ x: .16, z: -.49, elevation: .30, yaw: -.13 + .32 * pass * (1 - ramp(5.1, 6.5)),
      grip, spread: .39, lean: .32 + recoil * .12, breath: Math.sin(time * 1.7),
      look: -.65 + 1.42 * ramp(1.84, 2.32) - 1.42 * ramp(5.4, 6.25),
      tilt: -.06 * weight + .06 * recoil, blink: blink(.71) + blink(4.2) });
    contacts[0].position.x = kevin.root.position.x;
    contacts[2].position.x = bob.root.position.x;
    camera.position.set(.38 + .24 * Math.sin(time * .48), 1.76 + .055 * Math.sin(time * .44), 6.12 + .19 * Math.cos(time * .40));
    camera.lookAt(.12 + .09 * Math.sin(time * .50), 1.04, .15);
    renderer.render(scene, camera);
    element.classList.add('ready');
    if (playing) frame = requestAnimationFrame(render);
  }

  function wake() {
    cancelAnimationFrame(frame);
    render(performance.now());
  }

  function resize() {
    camera.aspect = element.clientWidth / Math.max(1, element.clientHeight);
    camera.fov = camera.aspect < 1.3 ? 40 : 32;
    camera.updateProjectionMatrix();
    renderer.setSize(element.clientWidth, element.clientHeight, false);
    wake();
  }

  function controls() {
    button.hidden = motion.matches;
    button.textContent = paused ? 'Reprendre l’animation' : 'Mettre en pause';
    wake();
  }

  button.addEventListener('click', () => {
    paused = !paused;
    controls();
  });
  motion.addEventListener('change', controls);
  document.addEventListener('visibilitychange', wake);
  new ResizeObserver(resize).observe(element);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    wake();
  }).observe(element);
  resize();
  controls();
}
