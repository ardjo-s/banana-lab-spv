(() => {
  const stage = document.querySelector('#stage');

  function loadScene() {
    const script = document.createElement('script');
    script.src = 'three.min.js';
    script.onload = () => {
      try {
        createScene(stage);
      } catch (error) {
        console.info('Trajet statique affiché.', error.message);
      }
    };
    document.head.append(script);
  }

  const loader = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      loader.disconnect();
      loadScene();
    }
  }, { rootMargin: '400px' });
  loader.observe(stage);
})();

function createScene(stage) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  stage.prepend(renderer.domElement);
  renderer.domElement.setAttribute('aria-hidden', 'true');

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera();
  camera.position.set(1.7, 10, 14);
  camera.lookAt(0, .3, 0);
  const sun = new THREE.DirectionalLight(0xffecd0, 2.6);
  sun.position.set(-4, 9, 5);
  sun.castShadow = true;
  Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 5, bottom: -6, far: 26 });
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.normalBias = .035;
  scene.add(sun, new THREE.HemisphereLight(0xfffbf1, 0xa1b79c, 2.5));

  const material = (color, roughness = .64) => new THREE.MeshStandardMaterial({ color, roughness });
  const wood = material(0xb17639);
  const paleWood = material(0xddaa65);
  const darkWood = material(0x755032);
  const green = material(0x356b51);
  const cream = material(0xffecd0);
  const rust = material(0xc55428);
  const gold = material(0xffba2c, .32);
  const stem = material(0x705229);
  const board = material(0x829875);
  const pathMaterial = material(0xf1e4ba);
  const unit = new THREE.BoxGeometry(1, 1, 1);

  function add(parent, geometry, surface, x, y, z) {
    const mesh = new THREE.Mesh(geometry, surface);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function box(parent, surface, x, y, z, width, height, depth) {
    const mesh = add(parent, unit, surface, x, y, z);
    mesh.scale.set(width, height, depth);
    return mesh;
  }

  const stops = [
    new THREE.Vector3(-5.15, 0, -.46),
    new THREE.Vector3(-1.73, 0, .2),
    new THREE.Vector3(1.78, 0, -.18),
    new THREE.Vector3(5.14, 0, .28)
  ];

  box(scene, board, 0, -.28, 0, 12.7, .5, 3.7);
  // The middle of the route belongs to the project company.
  const projectFloor = box(scene, material(0xc7cc9b), 0, -.032, 0, 6.17, .045, 3.57);
  projectFloor.castShadow = false;
  const lane = new THREE.CatmullRomCurve3(stops.map(point => new THREE.Vector3(point.x, -.012, point.z + .7)));
  for (let i = 0; i <= 40; i++) {
    const point = lane.getPoint(i / 40);
    box(scene, pathMaterial, point.x, .03, point.z, .15, .025, .065);
  }

  function crate(parent, x, y, z) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    parent.add(group);
    box(group, darkWood, 0, .06, 0, 1.17, .12, .8);
    for (const side of [-1, 1]) {
      for (const height of [.17, .32, .47]) {
        box(group, paleWood, 0, height, side * .39, 1.2, .115, .07);
        box(group, wood, side * .56, height, 0, .065, .115, .78);
      }
      for (const end of [-1, 1]) {
        box(group, darkWood, end * .51, .305, side * .437, .09, .45, .06);
      }
    }
    return group;
  }

  function bananaGeometry() {
    const positions = [];
    const colors = [];
    const indices = [];
    const length = 24;
    const facets = 16;
    const peel = new THREE.Color(0xffcb26);
    const tip = new THREE.Color(0x64502a);
    for (let ring = 0; ring <= length; ring++) {
      const t = ring / length;
      const theta = (t - .5) * 1.92;
      const profile = Math.pow(Math.sin(Math.PI * t), .67);
      const radius = .019 + profile * .099;
      const color = peel.clone().lerp(tip, Math.max(0, 1 - Math.min(t, 1 - t) * 17));
      for (let side = 0; side < facets; side++) {
        const angle = side * Math.PI * 2 / facets;
        const ridge = radius * (1 + .095 * Math.cos(angle * 5));
        const curveRadius = .47 + ridge * Math.cos(angle);
        positions.push(Math.sin(theta) * curveRadius, .47 - Math.cos(theta) * curveRadius, ridge * Math.sin(angle));
        colors.push(color.r, color.g, color.b);
        if (ring < length) {
          const a = ring * facets + side;
          const b = ring * facets + (side + 1) % facets;
          indices.push(a, a + facets, b, b, a + facets, b + facets);
        }
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }

  const peel = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .43, side: THREE.DoubleSide });
  const fruit = bananaGeometry();

  function bunch(parent, count, x, y, z) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    parent.add(group);
    for (let i = 0; i < count; i++) {
      const banana = add(group, fruit, peel, 0, i % 2 * .075, (i - (count - 1) / 2) * .14);
      banana.rotation.set(-.38 + i * .12, (i - 2) * .12, .26 - i * .11);
    }
    return group;
  }

  // Pallets and workshop cargo.
  const [supplier, storage, stall, customer] = stops;
  for (let i = 0; i < 5; i++) {
    box(scene, darkWood, supplier.x, .075, -1.18 + i * .19, 2.25, .13, .15);
  }
  const backCrate = crate(scene, supplier.x - .44, .15, -1.15);
  bunch(backCrate, 4, 0, .49, 0);

  // Open storage rack with two shelves.
  for (const x of [-1, 1]) {
    for (const z of [-.48, .48]) {
      box(scene, green, storage.x + x * .8, .67, -.66 + z, .1, 1.39, .1);
    }
  }
  for (const y of [.15, .79, 1.36]) {
    box(scene, paleWood, storage.x, y, -.66, 1.72, .105, 1.02);
  }
  const reserve = crate(scene, storage.x, .855, -.66);
  reserve.scale.setScalar(.77);

  // Market stall with a striped awning and till.
  for (const [x, z] of [[-.86, -.59], [.86, -.59], [-.86, .43], [.86, .43]]) {
    box(scene, darkWood, stall.x + x, 1, stall.z + z, .09, 2, .09);
  }
  box(scene, green, stall.x, .46, stall.z, 1.63, .89, .92);
  for (let i = 0; i < 7; i++) {
    box(scene, paleWood, stall.x - .7 + i * .23, .46, stall.z + .47, .16, .82, .05);
    box(scene, i % 2 === 0 ? rust : cream, stall.x - .87 + i * .29, 2.03, stall.z, .29, .08, 1.25).rotation.x = .2;
    box(scene, i % 2 === 0 ? rust : cream, stall.x - .87 + i * .29, 1.9, stall.z + .61, .29, .13, .055);
  }
  box(scene, paleWood, stall.x, .94, stall.z, 1.9, .11, 1.05);
  box(scene, darkWood, stall.x - .64, 1.06, stall.z - .08, .30, .17, .27);

  // Customer pickup table.
  box(scene, paleWood, customer.x, .63, customer.z - .55, 1.5, .11, .95);
  for (const x of [-.62, .62]) {
    for (const z of [-.35, .35]) {
      box(scene, darkWood, customer.x + x, .29, customer.z - .55 + z, .09, .61, .09);
    }
  }
  const pickup = crate(scene, customer.x, .69, customer.z - .55);
  pickup.scale.set(.9, .52, .82);

  const cargo = crate(scene, 0, 0, 0);
  const bananas = bunch(scene, 5, 0, 0, 0);
  const coin = add(scene, new THREE.CylinderGeometry(.15, .15, .045, 28), gold, 0, 0, 0);
  add(coin, new THREE.TorusGeometry(.106, .012, 8, 24), stem, 0, .025, 0).rotation.x = Math.PI / 2;
  const cratePositions = [
    new THREE.Vector3(supplier.x + .2, .14, supplier.z + .45),
    new THREE.Vector3(storage.x, .04, storage.z + .43),
    new THREE.Vector3(stall.x + .15, .04, stall.z + .79)
  ];
  const fruitPositions = [
    new THREE.Vector3(supplier.x + .2, .73, supplier.z + .45),
    new THREE.Vector3(storage.x, .63, storage.z + .43),
    new THREE.Vector3(stall.x + .15, 1.16, stall.z + .51),
    new THREE.Vector3(customer.x, .98, customer.z - .46)
  ];
  const pinPositions = stops.map(point => new THREE.Vector3(point.x, .12, 1.52));
  const pins = [...stage.querySelectorAll('.pin')];
  const projection = new THREE.Vector3();
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let current = Number(stage.dataset.step || 0);
  let origin = current;
  let target = current;
  let start = performance.now();
  let frame = 0;
  let visible = true;

  function positionBetween(object, path, progress) {
    const index = Math.min(path.length - 2, Math.floor(progress));
    const local = Math.min(1, progress - index);
    object.position.lerpVectors(path[index], path[index + 1], local);
    return local;
  }

  function render(time) {
    frame = 0;
    const duration = target === 3 ? 1650 : 1100;
    const amount = motion.matches || origin === target ? 1 : Math.min(1, (time - start) / duration);
    const movement = 1 - (1 - amount) ** 3;
    current = THREE.MathUtils.lerp(origin, target, movement);
    positionBetween(cargo, cratePositions, Math.min(current, 2));
    const local = positionBetween(bananas, fruitPositions, current);
    const toss = Math.sin(local * Math.PI);
    bananas.position.y += current > 1 ? toss * .84 : toss * .07;
    bananas.rotation.set(toss * .19, current * -.25, toss * -.56);

    const sale = target === 3 ? Math.max(0, (amount - .32) / .68) : 0;
    coin.visible = sale > 0;
    coin.position.set(THREE.MathUtils.lerp(customer.x, stall.x - .64, sale), 1.22 + Math.sin(sale * Math.PI) * 1.05, stall.z - .08);
    coin.rotation.set(.22, 0, Math.PI * (sale * 4 + .1));
    renderer.render(scene, camera);
    if (visible && amount < 1) frame = requestAnimationFrame(render);
  }

  function redraw() {
    cancelAnimationFrame(frame);
    render(performance.now());
  }

  function resize() {
    const { clientWidth: width, clientHeight: height } = stage;
    const ratio = width / height;
    const horizontal = 7.35;
    const vertical = Math.max(3.15, horizontal / ratio);
    Object.assign(camera, { left: -vertical * ratio, right: vertical * ratio, top: vertical, bottom: -vertical, near: .1, far: 50 });
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    renderer.setSize(width, height, false);
    pins.forEach((pin, i) => {
      projection.copy(pinPositions[i]).project(camera);
      pin.style.left = ((1 + projection.x) * 50) + '%';
      pin.style.top = ((1 - projection.y) * 50) + '%';
    });
    redraw();
  }

  function highlight() {
    pins.forEach((pin, i) => pin.classList.toggle('active', i === target));
  }

  stage.addEventListener('route-step', event => {
    origin = current;
    target = event.detail;
    start = performance.now();
    highlight();
    redraw();
  });
  new ResizeObserver(resize).observe(stage);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    redraw();
  }).observe(stage);
  motion.addEventListener('change', redraw);
  renderer.domElement.addEventListener('webglcontextlost', () => stage.classList.remove('ready'));
  renderer.domElement.addEventListener('webglcontextrestored', () => {
    resize();
    stage.classList.add('ready');
  });
  resize();
  highlight();
  stage.classList.add('ready');
}
