function createCover(element) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  element.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, .1, 30);
  const key = new THREE.DirectionalLight(0xffcf92, 3.4);
  key.position.set(-3, 6, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.normalBias = .035;
  const rim = new THREE.DirectionalLight(0xaecfff, 2.5);
  rim.position.set(4, 3, -4);
  scene.add(key, rim, new THREE.HemisphereLight(0xfff2d6, 0x80767a, 1.65));

  function box(parent, material, x, y, z, w, h, d) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    mesh.receiveShadow = mesh.castShadow = true;
    parent.add(mesh);
  }

  const timber = new THREE.MeshStandardMaterial({ color: 0x936039, roughness: .83 });
  const boards = new THREE.MeshStandardMaterial({ color: 0xbe8750, roughness: .78 });
  const floor = new THREE.MeshStandardMaterial({ color: 0x4f4235, roughness: .85 });
  box(scene, floor, 0, -.09, 0, 11, .16, 7);
  for (let i = -5; i <= 5; i++) box(scene, timber, i * .42, .02, -1.68, .39, .035, 1.15);

  const crate = new THREE.Group();
  scene.add(crate);
  crate.position.set(.15, 0, .83);
  box(crate, timber, 0, .10, 0, 1.18, .20, .76);
  for (const side of [-1, 1]) {
    for (const y of [.23, .37, .51]) {
      box(crate, boards, 0, y, side * .37, 1.18, .105, .065);
      box(crate, timber, side * .56, y, 0, .065, .105, .76);
    }
  }

  const bunch = new THREE.Group();
  scene.add(bunch);
  const peel = new THREE.MeshPhysicalMaterial({ color: 0xffbf25, roughness: .48, clearcoat: .19 });
  const tip = new THREE.MeshStandardMaterial({ color: 0x624022 });
  const stem = new THREE.SphereGeometry(.044, 12, 8);
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-.38, .15, 0), new THREE.Vector3(-.20, .009, 0),
    new THREE.Vector3(.08, -.018, 0), new THREE.Vector3(.30, .10, 0),
    new THREE.Vector3(.37, .24, 0)
  ]);
  const fruit = new THREE.TubeGeometry(curve, 28, .075, 12, false);
  for (let i = 0; i < 5; i++) {
    const banana = new THREE.Group();
    banana.position.set(0, i % 2 * .067, (i - 2) * .12);
    banana.rotation.y = (i - 2) * .13;
    const mesh = new THREE.Mesh(fruit, peel);
    mesh.castShadow = true;
    banana.add(mesh);
    for (const t of [0, 1]) {
      const end = new THREE.Mesh(stem, tip);
      end.position.copy(curve.getPoint(t));
      banana.add(end);
    }
    bunch.add(banana);
  }

  const [kevin, stuart, bob] = makeMinions(THREE);
  scene.add(kevin.root, stuart.root, bob.root);
  const grip = new THREE.Vector3();
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const button = element.querySelector('button');
  let paused = false;
  let visible = true;
  let frame = 0;
  let seconds = .7;
  let previous;

  function render(now) {
    frame = 0;
    const playing = visible && !document.hidden && !paused && !motion.matches;
    if (playing && previous !== undefined) seconds += Math.min(.05, (now - previous) / 1000);
    previous = playing ? now : undefined;
    const time = motion.matches ? 2.6 : seconds;
    const lift = .5 - .5 * Math.cos(time * 1.38);
    bunch.position.set(-.67 + lift * 1.07, .66 + Math.sin(lift * Math.PI) * .52 + (1 - lift) * .25, .69 + lift * .15);
    bunch.rotation.set(.08, .14 - lift * .39, .11 - lift * .24);
    const handoff = THREE.MathUtils.smoothstep(lift, .46, .82);
    kevin.pose({ x: -.95, z: -.10, yaw: .32, grip: bunch.position, contact: 1 - handoff, lean: .3 * lift, look: .65 });
    bob.pose({ x: 1.06, z: .15, yaw: -.56, grip: bunch.position, contact: handoff, lean: lift * .30, look: -.58 });
    grip.copy(crate.position).add(new THREE.Vector3(0, .45, -.25));
    stuart.pose({ x: .25, z: -.50, yaw: -.09, grip, spread: .40, lean: .35, look: -.36 });
    const cameraX = .23 + Math.sin(time * .38) * .23;
    camera.position.set(cameraX, 2.38, 6.8);
    camera.lookAt(.05, 1.03, .16);
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
