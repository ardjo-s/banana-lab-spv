function makeMinions(THREE) {
  const sphere = new THREE.SphereGeometry(1, 28, 20);
  const limb = new THREE.CylinderGeometry(1, 1, 1, 14);
  const vector = (x, y, z) => new THREE.Vector3(x, y, z);
  const up = vector(0, 1, 0);
  const paint = (color, roughness = .52, metalness = 0) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness });

  const skin = new THREE.MeshPhysicalMaterial({
    color: 0xffc518, roughness: .49, sheen: .22, sheenColor: 0xffd147,
    clearcoat: .13, clearcoatRoughness: .6
  });
  const boot = paint(0x22252b, .34);
  const rubber = paint(0x242630, .58);
  const hair = paint(0x312420);
  const mouth = paint(0x421a13);
  const enamel = paint(0xfff8e5, .34);
  const irisWhite = paint(0xfff7e4, .27);
  const button = paint(0xd6a04c, .32, .52);

  function texture(width, height, draw) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    draw(canvas.getContext('2d'), width, height);
    const bitmap = new THREE.CanvasTexture(canvas);
    bitmap.colorSpace = THREE.SRGBColorSpace;
    return bitmap;
  }

  const pores = paintedSurface(256, 256, (ctx, random) => {
    const pixels = ctx.createImageData(256, 256);
    for (let n = 0; n < pixels.data.length; n += 4) {
      const tone = 155 + 90 * random();
      pixels.data.set([tone, tone, tone, 255], n);
    }
    ctx.putImageData(pixels, 0, 0);
  });
  pores.repeat.set(3, 2);
  skin.bumpMap = pores;
  skin.bumpScale = .0026;
  skin.roughnessMap = pores;
  skin.roughness = .64;
  rubber.bumpMap = pores;
  rubber.bumpScale = .0018;

  const irisMaterials = new Map();
  function irisSurface(color) {
    if (irisMaterials.has(color)) return irisMaterials.get(color);
    const map = paintedSurface(192, 192, (ctx, random) => {
      ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
      ctx.fillRect(0, 0, 192, 192);
      for (let i = 0; i < 780; i++) {
        const a = random() * Math.PI * 2;
        const r = 30 + random() * 42;
        const end = r + random() * (92 - r);
        ctx.strokeStyle = random() < .48 ? '#38230c80' : '#ffe7a87a';
        ctx.lineWidth = .5 + random() * 1.2;
        ctx.beginPath();
        ctx.moveTo(96 + Math.cos(a) * r, 96 + Math.sin(a) * r);
        ctx.lineTo(96 + Math.cos(a + .04) * end, 96 + Math.sin(a + .04) * end);
        ctx.stroke();
      }
      const shade = ctx.createRadialGradient(96, 96, 60, 96, 96, 96);
      shade.addColorStop(0, 'transparent');
      shade.addColorStop(1, '#251f17');
      ctx.fillStyle = shade;
      ctx.fillRect(0, 0, 192, 192);
    });
    const surface = new THREE.MeshPhysicalMaterial({ map, roughness: .3, clearcoat: .9 });
    irisMaterials.set(color, surface);
    return surface;
  }
  const weave = texture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#315980';
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 2) {
      for (let x = 0; x < w; x += 2) {
        const light = (x * 17 + y * 29 + x * y * 7) % 21;
        ctx.fillStyle = (x - y) % 6 === 0 ? '#778eaa55' : 'rgba(16,29,53,' + light / 115 + ')';
        ctx.fillRect(x, y, 2, 2);
      }
    }
  });
  weave.wrapS = weave.wrapT = THREE.RepeatWrapping;
  weave.repeat.set(2, 2);
  const denim = new THREE.MeshPhysicalMaterial({ color: 0xc8dcf3, map: weave, bumpMap: weave, bumpScale: .006, roughness: .82, sheen: .42, sheenColor: 0x88aaca });
  const seam = paint(0x416587);
  const thread = paint(0xc9a476);

  const studio = texture(256, 128, (ctx, w, h) => {
    const light = ctx.createLinearGradient(0, 0, 0, h);
    light.addColorStop(0, '#cdddef');
    light.addColorStop(.42, '#6a7e8a');
    light.addColorStop(.57, '#211d18');
    light.addColorStop(1, '#4b3b30');
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#fff7db';
    ctx.fillRect(38, 18, 32, 41);
    ctx.fillStyle = '#d5f3ff';
    ctx.fillRect(172, 22, 23, 42);
  });
  studio.mapping = THREE.EquirectangularReflectionMapping;
  const steel = paint(0xb6c1c8, .24, .75);
  steel.envMap = studio;
  steel.envMapIntensity = 1.4;
  const bevel = paint(0x707a84, .31, .58);
  bevel.envMap = studio;

  function attach(parent, geometry, material, x, y, z) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function oval(parent, surface, x, y, z, sx, sy, sz) {
    const mesh = attach(parent, sphere, surface, x, y, z);
    mesh.scale.set(sx, sy, sz);
    return mesh;
  }

  function path(parent, surface, points, radius, segments = 16) {
    const line = new THREE.CatmullRomCurve3(points);
    return attach(parent, new THREE.TubeGeometry(line, segments, radius, 7, false), surface, 0, 0, 0);
  }

  function strap(parent, points, width) {
    const curve = new THREE.CatmullRomCurve3(points);
    const vertices = [], uv = [], indices = [];
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const at = curve.getPoint(t);
      const across = curve.getTangent(t).cross(vector(at.x, 0, at.z).normalize()).normalize();
      for (const edge of [-1, 1]) {
        const point = at.clone().addScaledVector(across, edge * width / 2);
        vertices.push(point.x, point.y, point.z);
        uv.push((edge + 1) / 2, t);
      }
      if (i < 20) {
        const n = i * 2;
        indices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
      }
    }
    const fabric = new THREE.BufferGeometry();
    fabric.setIndex(indices);
    fabric.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    fabric.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    fabric.computeVertexNormals();
    const lining = denim.clone();
    lining.side = THREE.DoubleSide;
    attach(parent, fabric, lining, 0, 0, 0);
  }

  function rounded(parent, surface, width, height, corner, depth, x, y, z) {
    const s = new THREE.Shape();
    const left = -width / 2, bottom = -height / 2, right = width / 2, top = height / 2;
    s.moveTo(left + corner, bottom);
    s.lineTo(right - corner, bottom);
    s.quadraticCurveTo(right, bottom, right, bottom + corner);
    s.lineTo(right, top - corner);
    s.quadraticCurveTo(right, top, right - corner, top);
    s.lineTo(left + corner, top);
    s.quadraticCurveTo(left, top, left, top - corner);
    s.lineTo(left, bottom + corner);
    s.quadraticCurveTo(left, bottom, left + corner, bottom);
    return attach(parent, new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelSize: .013, bevelThickness: .012, bevelSegments: 2, curveSegments: 6 }), surface, x, y, z);
  }

  function segment(mesh, from, to, radius) {
    mesh.position.copy(from).lerp(to, .5);
    mesh.quaternion.setFromUnitVectors(up, mesh.userData.axis.subVectors(to, from).normalize());
    mesh.scale.set(radius, from.distanceTo(to) + .032, radius);
  }

  function makeArm(parent, side) {
    const group = new THREE.Group();
    parent.add(group);
    const upper = attach(group, limb, skin, 0, 0, 0);
    const lower = attach(group, limb, skin, 0, 0, 0);
    upper.userData.axis = vector(0, 0, 0);
    lower.userData.axis = vector(0, 0, 0);
    const joint = oval(group, skin, 0, 0, 0, .074, .074, .074);
    const glove = new THREE.Group();
    group.add(glove);
    oval(glove, rubber, 0, 0, -.023, .105, .103, .093);
    const fingers = [];
    for (let finger = -1; finger <= 1; finger++) {
      const tip = oval(glove, boot, finger * .051, .05, .029, .036, .067, .039);
      tip.rotation.z = -finger * .15;
      fingers.push(tip);
    }
    oval(glove, boot, side * -.076, -.021, .045, .042, .063, .04).rotation.z = side * .48;
    const bend = vector(0, 0, 0);
    const shoulder = vector(0, 0, 0);
    const wrist = vector(0, 0, 0);
    return {
      pose(radius, lift, goal, localZ, contact, swing) {
        shoulder.set(side * radius * .94, .92 + lift, .045);
        wrist.set(side * (radius + .12), .46 + lift, .16 + side * swing);
        if (goal) wrist.lerp(goal, contact);
        bend.copy(shoulder).lerp(wrist, .5);
        bend.x += side * .12;
        bend.y -= .09 + Math.max(0, .61 - shoulder.distanceTo(wrist)) * .38;
        segment(upper, shoulder, bend, .079);
        segment(lower, bend, wrist, .069);
        joint.position.copy(bend);
        const squeeze = goal ? contact : 0;
        fingers.forEach((tip, i) => {
          tip.rotation.x = -.22 + squeeze * .88;
          tip.rotation.z = (1 - i) * (.22 - squeeze * .14);
          tip.position.z = .032 + squeeze * .028;
        });
        glove.position.copy(wrist);
        glove.rotation.set(-.38 + contact * .5, -side * .26, side * (.14 - localZ * .27));
      }
    };
  }

  function create({ height, radius, eyes, hairStyle, irisColors }) {
    const root = new THREE.Group();
    const torso = new THREE.Group();
    root.add(torso);
    const base = .27;
    const eyeY = base + radius + height + .028;
    const center = base + radius + height / 2;
    attach(torso, new THREE.CapsuleGeometry(radius, height, 16, 52), skin, 0, center, 0);

    const hips = [];
    for (let i = 0; i <= 18; i++) {
      const theta = i * Math.PI / 36;
      hips.push(new THREE.Vector2(Math.sin(theta) * (radius + .013), base + radius - Math.cos(theta) * radius));
    }
    hips.push(new THREE.Vector2(radius + .013, .83));
    attach(torso, new THREE.LatheGeometry(hips, 56), denim, 0, 0, 0);
    const bib = rounded(torso, denim, radius * 1.5, .36, .085, .045, 0, .875, radius * .85);
    bib.rotation.x = -.10;
    rounded(torso, seam, .26, .14, .036, .018, 0, .88, radius * .85 + .059);
    path(torso, thread, [vector(-.108, .934, radius * .85 + .083), vector(0, .926, radius * .85 + .083), vector(.108, .934, radius * .85 + .083)], .009);
    for (const side of [-1, 1]) {
      strap(torso, [
        vector(side * .30, .995, radius * .90), vector(side * (radius - .055), 1.14, radius * .49),
        vector(side * (radius - .019), 1.165, -.055), vector(side * .35, 1.01, -radius * .82)
      ], .122);
      oval(torso, button, side * .29, .997, radius * .88 + .046, .053, .053, .026);
      path(torso, thread, [
        vector(side * radius * .67, .81, radius * .74), vector(side * radius * .83, .72, radius * .57),
        vector(side * radius * .86, .60, radius * .45)
      ], .009);
    }

    const strapRadius = Math.sqrt(radius ** 2 - .025 ** 2) + .009;
    attach(torso, new THREE.CylinderGeometry(strapRadius, strapRadius, .111, 52, 1, true), rubber, 0, eyeY, 0);
    const goggles = eyes === 1 ? [0] : [-.225, .225];
    const gaze = [];
    goggles.forEach((x, i) => {
      const r = eyes === 1 ? .273 : .202;
      const z = radius * .95;
      const eye = new THREE.Group();
      eye.position.set(x, eyeY, z);
      eye.rotation.y = x * .44;
      torso.add(eye);
      oval(eye, bevel, 0, 0, .028, r + .037, r + .04, .09);
      oval(eye, irisWhite, 0, 0, .102, r * .92, r * .92, .072);
      attach(eye, new THREE.TorusGeometry(r, .038, 15, 48), steel, 0, 0, .139);
      attach(eye, new THREE.TorusGeometry(r * .91, .013, 9, 40), bevel, 0, 0, .151);
      for (const direction of [-1, 1]) {
        oval(eye, steel, direction * r * .72, r * .719, .166, .019, .019, .019);
      }
      const pupil = new THREE.Group();
      pupil.position.set(0, 0, .171);
      eye.add(pupil);
      oval(pupil, paint(0x342721), 0, 0, 0, r * .45, r * .45, .024);
      attach(pupil, new THREE.CircleGeometry(r * .405, 52), irisSurface(irisColors[i]), 0, 0, .023);
      oval(pupil, paint(0x1b1717, .21), 0, 0, .029, r * .205, r * .205, .01);
      oval(pupil, enamel, -r * .14, r * .155, .04, .029, .024, .009);
      const lidSocket = new THREE.Group();
      lidSocket.position.set(0, 0, .102);
      lidSocket.scale.set(r * .94, r * .94, .134);
      eye.add(lidSocket);
      const eyelid = attach(lidSocket, new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), skin, 0, 0, 0);
      eyelid.castShadow = false;
      gaze.push({ pupil, eyelid });

    });

    const smileY = eyeY - (eyes === 1 ? .385 : .33);
    const smile = new THREE.Shape();
    smile.moveTo(-.205, .039);
    smile.bezierCurveTo(-.075, -.003, .09, -.003, .21, .056);
    smile.bezierCurveTo(.137, -.148, -.14, -.139, -.205, .039);
    const grin = attach(torso, new THREE.ShapeGeometry(smile, 18), mouth, 0, smileY, radius + .009);
    grin.castShadow = false;
    const teeth = new THREE.Group();
    teeth.position.set(0, smileY, radius + .014);
    torso.add(teeth);
    for (const x of [-.098, -.033, .034, .10]) {
      rounded(teeth, enamel, .048, .021, .008, .005, x, .001 + Math.abs(x) * .1, 0);
    }

    const scalp = base + radius * 2 + height;
    if (hairStyle !== 'none') {
      const count = hairStyle === 'tall' ? 11 : 16;
      for (let i = 0; i < count; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const t = i / (count - 1);
        const z = (t - .5) * .25;
        const points = hairStyle === 'tall'
          ? [vector(side * .023, scalp - .024, z), vector(side * (.03 + .03 * t), scalp + .105, z - .025),
             vector(side * (.063 + .081 * t), scalp + .178 - .065 * t, z - .074)]
          : [vector(side * .014, scalp + .004, z), vector(side * .21, scalp - .033, z - .034),
             vector(side * (.33 + t * .04), scalp - .14 - t * .052, z - .079)];
        path(torso, hair, points, hairStyle === 'tall' ? .007 : .009, 12);
      }
    }

    const arms = [-1, 1].map(side => makeArm(torso, side));
    const feet = [-1, 1].map(side => {
      const leg = new THREE.Group();
      leg.position.x = side * radius * .43;
      root.add(leg);
      oval(leg, denim, 0, .238, 0, .118, .16, .123);
      oval(leg, boot, 0, .109, .087, .142, .106, .196);
      oval(leg, rubber, 0, .046, .082, .146, .047, .19);
      return leg;
    });
    const leftGoal = vector(0, 0, 0);
    const rightGoal = vector(0, 0, 0);
    const reachGoal = vector(0, 0, 0);

    function pose({ x, z, yaw = 0, stride = 0, gait = 0, lean = 0, grip = null, spread = .32, contact = 1, look = 0, blink = 0, tilt = 0, breath = 0, smile = 0, catchPoint = null, catchWeight = 1, elevation = 0 }) {
      const step = Math.sin(gait) * stride;
      root.position.set(x, elevation, z);
      root.rotation.y = yaw;
      torso.position.y = Math.abs(step) * .048 - lean * .15 + breath * .016;
      torso.rotation.set(lean * .28, step * -.052, step * .052 + tilt);
      feet.forEach((leg, index) => {
        const swing = index === 0 ? step : -step;
        leg.position.y = Math.max(0, swing) * .12;
        leg.position.z = swing * .24;
        leg.rotation.x = -swing * .30;
      });
      root.updateMatrixWorld(true);
      if (grip) {
        leftGoal.copy(grip);
        rightGoal.copy(grip);
        leftGoal.x -= Math.cos(yaw) * spread;
        rightGoal.x += Math.cos(yaw) * spread;
        leftGoal.z += Math.sin(yaw) * spread;
        rightGoal.z -= Math.sin(yaw) * spread;
        torso.worldToLocal(leftGoal);
        torso.worldToLocal(rightGoal);
      }
      if (catchPoint) {
        reachGoal.copy(catchPoint);
        torso.worldToLocal(reachGoal);
        rightGoal.lerp(reachGoal, catchWeight);
      }
      arms[0].pose(radius, height * .19, grip ? leftGoal : null, lean, contact, step * .12);
      arms[1].pose(radius, height * .19, grip || catchPoint ? rightGoal : null, lean, catchPoint ? Math.max(catchWeight, contact) : contact, step * .12);
      for (const { pupil, eyelid } of gaze) {
        pupil.position.set(look * .059, -.012 - Math.max(0, lean) * .045, .171);
        eyelid.rotation.x = -1.16 + blink * 2.68 + lean * .12;
      }
      grin.scale.y = 1 - lean * .24 + smile * .43;
      grin.scale.x = 1 + smile * .09;
    }
    return { root, pose };
  }

  return [
    create({ height: .88, radius: .48, eyes: 2, hairStyle: 'tall', irisColors: [0x98653d, 0x98653d] }),
    create({ height: .53, radius: .49, eyes: 1, hairStyle: 'tuft', irisColors: [0x96613b] }),
    create({ height: .29, radius: .49, eyes: 2, hairStyle: 'none', irisColors: [0x679144, 0x965e36] }),
    create({ height: .47, radius: .43, eyes: 2, hairStyle: 'tuft', irisColors: [0x8b603f, 0x8b603f] })
  ];
}
