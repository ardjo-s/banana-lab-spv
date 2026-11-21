(() => {
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.append(script);
    });
  }
  const models = loadScript('three.min.js').then(() => loadScript('minions.js?v=4'));
  models.then(() => createCover(document.querySelector('.hero-scene'))).catch(console.info);
  const stage = document.querySelector('#stage');
  const loader = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    loader.disconnect();
    models.then(() => createScene(stage)).catch(console.info);
  }, { rootMargin: '400px' });
  loader.observe(stage);
})();

function createScene(stage) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.03;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  stage.prepend(renderer.domElement);
  renderer.domElement.setAttribute('aria-hidden', 'true');

  const scene = new THREE.Scene();
  scene.name = "Trajet";
  const camera = new THREE.OrthographicCamera();

  const sun = new THREE.DirectionalLight(0xffe5bf, 2.85);
  sun.position.set(-4, 9, 5);
  sun.castShadow = true;
  Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 5, bottom: -6, far: 26 });
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.normalBias = .035;
  const rim = new THREE.DirectionalLight(0xffcd89, 2.25);
  rim.position.set(4, 5, -6);
  scene.add(sun, rim, new THREE.HemisphereLight(0xe2eef3, 0xb29979, 1.62));

  const material = (color, roughness = .64) => new THREE.MeshStandardMaterial({ color, roughness });
  const wood = material(0xb17639);
  const paleWood = material(0xddaa65);
  const darkWood = material(0x755032);
  const grain = makeWoodGrain();
  for (const surface of [wood, paleWood, darkWood]) {
    surface.map = grain;
    surface.bumpMap = grain;
    surface.bumpScale = .009;
  }
  const green = material(0x356b51);
  const cream = material(0xffecd0);
  const rust = material(0xc55428);
  const gold = material(0xffba2c, .32);
  const stem = material(0x705229);
  const board = material(0x88745a);
  board.map = grain;
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

  box(scene, board, 0, -.28, .25, 13.6, .5, 4.6);
  // The middle of the route belongs to the project company.
  const projectFloor = box(scene, material(0xb4ad83), 0, -.032, .25, 6.17, .045, 4.52);
  projectFloor.castShadow = false;
  const lane = new THREE.CatmullRomCurve3(stops.map(point => new THREE.Vector3(point.x, -.012, point.z + 1.59)));
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

  const peel = makeFruitSurface();
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
  const backCrate = crate(scene, supplier.x - .91, .15, -1.05);
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
  const actors = makeMinions(THREE);
  actors.forEach(actor => scene.add(actor.root));

  const at = (x, y, z) => new THREE.Vector3(x, y, z);
  const source = at(supplier.x, .08, .71);
  const shelf = at(storage.x, .05, .97);
  const market = at(stall.x + .59, .04, 1.38);
  const counter = at(stall.x + .61, 1.095, stall.z + .34);
  const basket = at(customer.x, .89, customer.z - .46);
  const grip = at(0, 0, 0);
  const fruitPosition = at(0, 0, 0);
  const pinPositions = stops.map(point => at(point.x, .045, 2.10));
  const pins = [...stage.querySelectorAll('.pin')];
  const projection = at(0, 0, 0);
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let current = Number(stage.dataset.step || 0) + 1;
  let origin = current;
  let target = current;
  let start = performance.now();
  let duration = 1;
  let frame = 0;
  let visible = true;

  function ease(value) {
    const t = THREE.MathUtils.clamp(value, 0, 1);
    return t * t * (3 - 2 * t);
  }

  function phase(value, first, last) {
    return ease((value - first) / (last - first));
  }

  function moveCrate(from, to, time, finish, height, approach, stepAside) {
    const walk = phase(time, .21, finish - .16);
    const lift = phase(time, approach ? .14 : .04, .25) * (1 - phase(time, finish - .19, finish));
    cargo.position.lerpVectors(from, to, walk);
    cargo.position.y += lift * (height + .032 * Math.sin(walk * 42));
    cargo.rotation.set(lift * (-.04 + .035 * Math.sin(walk * 21)), -.06 * lift, lift * .033 * Math.cos(walk * 21));
    const movement = Math.sin(walk * Math.PI) * 1.18;
    const clear = stepAside ? phase(time, finish, .95) : 0;
    const enter = approach ? 1 - phase(time, 0, .14) : 0;
    actors[1].pose({
      x: cargo.position.x + .06 + enter * .84 - clear * .82,
      z: cargo.position.z - .69 + enter * .15 - clear * .27,
      yaw: .18 + .67 * movement - enter * .49 - clear * .14,
      stride: Math.min(1, movement),
      gait: walk * 21,
      lean: .19 + (1 - lift) * .41,
      grip: grip.copy(cargo.position).add(at(0, .36, 0)),
      spread: .45,
      contact: (1 - enter) * (1 - clear),
      look: .2 + .46 * phase(time, .12, .3),
      blink: Math.max(0, 1 - Math.abs(time - .42) * 17)
    });
  }

  function playScene(time) {
    const loading = Math.min(time, 1);
    const delivery = phase(time, 1, 2);
    const unload = phase(time, 2.56, 3);
    const walkToBuyer = phase(time, 3.22, 3.79);
    const handoff = phase(time, 3.78, 3.91);
    const stirring = Math.sin(loading * Math.PI);
    coin.visible = false;
    cargo.rotation.set(0, 0, 0);
    cargo.position.copy(time < 2 ? source : market);
    bananas.rotation.set(.09, -.16, .18);
    fruitPosition.copy(source).add(at(0, .53, 0));

    actors[0].pose({
      x: source.x - .37,
      z: source.z - .75,
      yaw: .51,
      lean: .17,
      look: .42
    });
    actors[1].pose({
      x: time <= 1 ? source.x + .90 : market.x - .76,
      z: time <= 1 ? source.z - .54 : market.z - .96,
      yaw: time <= 1 ? -.31 : .04,
      look: -.31
    });
    actors[2].pose({ x: stall.x + 1.44, z: 1.08, yaw: -.74, look: -.55 });
    actors[3].pose({ x: customer.x + .95, z: -.24, yaw: -.56, look: -.42 });

    if (time <= 1) {
      const reach = phase(loading, .1, .97);
      fruitPosition.set(source.x - .40 * (1 - reach), .95 + stirring * .19 - reach * .34, source.z - .29 * (1 - reach));
      actors[0].pose({
        x: source.x - .37, z: source.z - .74, yaw: .48,
        lean: .18 + reach * .50, grip: fruitPosition, spread: .28, look: .53,
        blink: Math.max(0, 1 - Math.abs(loading - .27) * 12)
      });
    } else if (time <= 2) {
      moveCrate(source, shelf, time - 1, 1, .45, true, false);
      fruitPosition.copy(cargo.position).add(at(0, .53, 0));
    } else if (time <= 3) {
      moveCrate(shelf, market, time - 2, .59, .42, false, true);
      fruitPosition.copy(cargo.position).add(at(0, .53, 0)).lerp(counter, unload);
      fruitPosition.y += Math.sin(unload * Math.PI) * .29;
      const reach = phase(time, 2.46, 2.60);
      actors[2].pose({
        x: stall.x + 1.44, z: 1.08 - unload * .46, yaw: -.74,
        look: -.48, lean: .5 * reach * (1 - .59 * unload), grip: fruitPosition,
        spread: .23, contact: reach
      });
    } else {
      const carry = phase(time, 3.13, 3.29) * (1 - handoff);
      fruitPosition.copy(counter).lerp(basket, walkToBuyer);
      fruitPosition.z += Math.sin(walkToBuyer * Math.PI) * .37;
      fruitPosition.y += carry * .24;
      const receive = phase(time, 3.86, 4);
      fruitPosition.x += receive * .31;
      fruitPosition.y += receive * .13;
      fruitPosition.z += receive * .22;
      bananas.rotation.z += Math.sin(walkToBuyer * Math.PI * 5) * carry * .11;
      actors[3].pose({
        x: customer.x + .95, z: -.24, yaw: -.62, grip: fruitPosition,
        spread: .24, contact: handoff, look: -.53, lean: handoff * .22
      });
      const bobX = THREE.MathUtils.lerp(stall.x + 1.44, customer.x - .82, walkToBuyer);
      const bobZ = THREE.MathUtils.lerp(.64, basket.z - .62, walkToBuyer) + Math.sin(walkToBuyer * Math.PI) * .48;
      actors[2].pose({
        x: bobX, z: bobZ,
        yaw: -.74 + phase(time, 3.12, 3.32) * 1.43 - handoff * .09,
        lean: .18 + handoff * .14, grip: fruitPosition, spread: .24, contact: 1 - receive,
        stride: Math.sin(walkToBuyer * Math.PI), gait: walkToBuyer * 15, look: .37,
        blink: Math.max(0, 1 - Math.abs(time - 3.63) * 17)
      });
      const sale = phase(time, 3.77, 4);
      coin.visible = sale > 0;
      coin.position.set(
        THREE.MathUtils.lerp(customer.x + .82, stall.x - .64, sale),
        1.18 + Math.sin(sale * Math.PI) * 1.02,
        THREE.MathUtils.lerp(basket.z, stall.z - .08, sale)
      );
      coin.rotation.set(.55 + sale * 15, 0, sale * 2.5);
    }
    bananas.position.copy(fruitPosition);

    const checkout = phase(time, 3.86, 4);
    const focus = time <= 1 ? source.x - .14
      : time <= 2 ? THREE.MathUtils.lerp(cargo.position.x, shelf.x, delivery * .06)
      : time <= 3 ? THREE.MathUtils.lerp(cargo.position.x, stall.x + .22, unload)
      : THREE.MathUtils.lerp(stall.x + .57, customer.x, walkToBuyer) - checkout * 1.30;
    const angle = .92 - .57 * delivery + .88 * walkToBuyer;
    const zoom = 1 - .15 * checkout;
    if (camera.zoom !== zoom) {
      camera.zoom = zoom;
      camera.updateProjectionMatrix();
    }
    for (const { root } of actors) root.visible = Math.abs(root.position.x - focus) < camera.right / zoom + 1.25;
    camera.position.set(focus + angle, 4.45, 10.4);
    camera.lookAt(focus, 1.05, .51);
    camera.updateMatrixWorld();
  }

  function render(time) {
    frame = 0;
    const amount = motion.matches ? 1 : Math.min(1, (time - start) / duration);
    current = THREE.MathUtils.lerp(origin, target, amount);
    playScene(current);
    renderer.render(scene, camera);
    pins.forEach((pin, i) => {
      projection.copy(pinPositions[i]).project(camera);
      pin.hidden = projection.x < -.77 || projection.x > .77;
      pin.style.left = ((1 + projection.x) * 50) + '%';
      pin.style.top = ((1 - projection.y) * 50) + '%';
    });
    if (visible && !document.hidden && amount < 1) frame = requestAnimationFrame(render);
  }

  function redraw() {
    cancelAnimationFrame(frame);
    render(performance.now());
  }

  function resize() {
    const { clientWidth: width, clientHeight: height } = stage;
    const ratio = width / height;
    const vertical = Math.max(1.82, 2.75 / ratio);
    Object.assign(camera, { left: -vertical * ratio, right: vertical * ratio, top: vertical, bottom: -vertical, near: .1, far: 50 });
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    redraw();
  }

  function play(index, replay = false) {
    const bounds = stage.getBoundingClientRect();
    visible = bounds.bottom > 0 && bounds.top < innerHeight;
    const chapterEnd = index + 1;
    origin = replay || current > chapterEnd || current < chapterEnd - 1 ? chapterEnd - 1 : current;
    target = chapterEnd;
    duration = index === 0 ? 1500 : 2450;
    start = performance.now();
    pins.forEach((pin, i) => pin.classList.toggle('active', i === index));
    redraw();
  }

  stage.addEventListener('route-step', event => play(event.detail, event.detail + 1 === target));
  new ResizeObserver(resize).observe(stage);
  new IntersectionObserver(([entry]) => {
    const firstEntry = entry.isIntersecting && !stage.dataset.intro;
    visible = entry.isIntersecting;
    if (firstEntry) {
      stage.dataset.intro = 'true';
      if (target === 1) play(0, true);
    }
    redraw();
  }).observe(stage);
  motion.addEventListener('change', redraw);
  document.addEventListener('visibilitychange', redraw);
  renderer.domElement.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    stage.classList.remove('ready');
  });
  renderer.domElement.addEventListener('webglcontextrestored', () => {
    resize();
    stage.classList.add('ready');
  });
  pins.forEach((pin, i) => pin.classList.toggle('active', i + 1 === target));
  resize();
  stage.classList.add('ready');
}
