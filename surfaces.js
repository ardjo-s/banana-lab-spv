// Repeatable surface patterns keep both WebGL scenes independent of texture downloads.
function paintedSurface(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  let seed = 7919;
  function random() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  draw(canvas.getContext('2d'), random);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

function makeWoodGrain() {
  return paintedSurface(512, 128, (ctx, random) => {
    ctx.fillStyle = '#e9ceac';
    ctx.fillRect(0, 0, 512, 128);
    for (let i = 0; i < 370; i++) {
      const y = random() * 128;
      const x = random() * 720 - 220;
      const length = 25 + random() * 400;
      ctx.strokeStyle = random() > .25 ? 'rgba(84,47,26,.18)' : 'rgba(255,245,206,.62)';
      ctx.lineWidth = .25 + random() * 1.35;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x + length * .39, y - 4 * Math.sin(y), x + length * .72, y + 2, x + length, y);
      ctx.stroke();
    }
  });
}

function makeFruitSurface() {
  const texture = paintedSurface(256, 128, (ctx, random) => {
    const wash = ctx.createLinearGradient(0, 0, 0, 128);
    wash.addColorStop(0, '#b2aa49');
    wash.addColorStop(.18, '#ffeb95');
    wash.addColorStop(.75, '#ffda74');
    wash.addColorStop(1, '#b6ac52');
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, 256, 128);
    for (let i = 0; i < 780; i++) {
      ctx.fillStyle = 'rgba(105,68,20,' + (.07 + random() * .32) + ')';
      ctx.fillRect(random() * 256, random() * 128, .5 + random() * 1.5, .5 + random() * 1.8);
    }
  });
  return new THREE.MeshPhysicalMaterial({ map: texture, vertexColors: true, roughness: .56, clearcoat: .12, side: THREE.DoubleSide });
}

function bananaGeometry() {
  const positions = [];
  const colors = [];
  const indices = [];
  const uv = [];
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
    for (let side = 0; side <= facets; side++) {
      const angle = side * Math.PI * 2 / facets;
      const ridge = radius * (1 + .095 * Math.cos(angle * 5));
      const curveRadius = .47 + ridge * Math.cos(angle);
      positions.push(Math.sin(theta) * curveRadius, .47 - Math.cos(theta) * curveRadius, ridge * Math.sin(angle));
      uv.push(side / facets, t);
      colors.push(color.r, color.g, color.b);
      if (ring < length && side < facets) {
        const a = ring * (facets + 1) + side;
        const b = a + 1;
        indices.push(a, a + facets + 1, b, b, a + facets + 1, b + facets + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
