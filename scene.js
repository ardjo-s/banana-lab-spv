document.querySelector('.quiz').addEventListener('click', event => {
  const answer = event.target.dataset.answer;
  if (answer) document.querySelector('#feedback').textContent = answer === 'oui'
    ? 'Exact ! Le panier sert au stand. Sa société le paie avec sa propre caisse.'
    : 'Qui garde les 2 € de la vente ? Regarde la deuxième étape et réessaie.';
});

function createStage() {
  const stage = document.querySelector('#stage');
  const renderer = new THREE.WebGLRenderer({ alpha:true, antialias:true, preserveDrawingBuffer:true });
  renderer.setPixelRatio(Math.min(devicePixelRatio,3));
  stage.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30,1,.1,50);
  camera.position.set(0,2.1,10.3);
  camera.lookAt(0,1.68,0);
  scene.add(new THREE.HemisphereLight(0xfff5df,0x8498b5,2.4));
  for (const [x,y,z,power] of [[-4,6,5,3],[4,3,-2,4]]) {
    const light = new THREE.DirectionalLight(0xffeed0,power);
    light.position.set(x,y,z);
    scene.add(light);
  }
  const sphere = new THREE.SphereGeometry(1,64,48);
  const mat = (color,metalness=0) => new THREE.MeshStandardMaterial({color,metalness,roughness:metalness?.26:.54});
  const yellow=mat(0xffc71b), blue=mat(0x195186), black=mat(0x24242a), silver=mat(0xaeb9c2,.65), white=mat(0xfff9df), brown=mat(0x82512b);
  function mesh(parent,geometry,material,x,y,z) {
    const part=new THREE.Mesh(geometry,material);
    part.position.set(x,y,z);
    parent.add(part);
    return part;
  }
  function oval(parent,m,x,y,z,a,b,c) {
    const part=mesh(parent,sphere,m,x,y,z);
    part.scale.set(a,b,c);
    return part;
  }
  function line(parent,m,points,radius) {
    const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
    return mesh(parent,new THREE.TubeGeometry(curve,24,radius,10,false),m,0,0,0);
  }
  function friend(x,z,tall,eyes,turn) {
    const group=new THREE.Group();
    scene.add(group);
    group.position.set(x,0,z);
    group.rotation.y=turn;
    const mid=1.55+tall/2;
    mesh(group,new THREE.CapsuleGeometry(.73,tall,24,72),yellow,0,mid,0);
    oval(group,blue,0,1.13,0,.748,.56,.75);
    oval(group,blue,0,1.42,.60,.48,.40,.16);
    oval(group,blue,0,1.41,.755,.22,.14,.03);
    for(const sign of [-1,1]){
      oval(group,blue,sign*.31,.65,0,.19,.33,.22);
      oval(group,black,sign*.32,.40,.09,.25,.17,.35);
      line(group,blue,[[sign*.67,1.73,-.1],[sign*.65,1.66,.28],[sign*.40,1.54,.65]],.085);
      oval(group,silver,sign*.38,1.54,.698,.045,.045,.025);
      oval(group,yellow,sign*.755,1.28,.02,.12,.37,.14);
      oval(group,black,sign*.78,.99,.07,.15,.19,.16);
    }
    const eyeY=mid+.21;
    mesh(group,new THREE.CylinderGeometry(.744,.744,.16,72),black,0,eyeY,0);
    const r=eyes===1?.37:.28;
    for(let i=0;i<eyes;i++){
      const ex=eyes===1?0:(i-.5)*.55;
      oval(group,white,ex,eyeY,.67,r,r,.18);
      mesh(group,new THREE.TorusGeometry(r,.064,24,80),silver,ex,eyeY,.735);
      oval(group,brown,ex+.013,eyeY,.835,r*.42,r*.42,.035);
      oval(group,black,ex+.015,eyeY,.86,r*.20,r*.20,.02);
      oval(group,white,ex-.013,eyeY+.035,.88,.028,.028,.012);
    }
    line(group,black,[[-.22,eyeY-.43,.696],[0,eyeY-.49,.735],[.22,eyeY-.40,.696]],.023);
    for(let i=-2;i<=2;i++){
      const y=mid+tall/2+.68;
      line(group,black,[[i*.09,y,0],[i*.12,y+.12,-.015],[i*.17+.025,y+.18,-.05]],.015);
    }
    return group;
  }
  const friends=[friend(-1.38,-.18,.55,1,.23),friend(.03,.18,1.22,2,-.06),friend(1.42,-.22,.36,2,-.25)];
  const platform=mesh(scene,new THREE.CylinderGeometry(2.7,2.55,.26,96),mat(0xe8ad26),0,.11,0);
  platform.scale.z=.55;
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  let visible=true,frame=0;
  function draw(ms=0){
    friends.forEach((g,i)=>{
      g.rotation.z=motion.matches?0:Math.sin(ms*.0014+i)*.026;
      g.position.y=motion.matches?0:Math.sin(ms*.0016+i)*.023;
    });
    renderer.render(scene,camera);
    if(visible&&!motion.matches&&!document.hidden) frame=requestAnimationFrame(draw);
  }
  function refresh(){
    cancelAnimationFrame(frame);
    const {width,height}=stage.getBoundingClientRect();
    camera.aspect=width/height;
    camera.updateProjectionMatrix();
    renderer.setSize(width,height,false);
    draw();
  }
  new ResizeObserver(refresh).observe(stage);
  new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;refresh()}).observe(stage);
  motion.addEventListener('change',refresh);
  document.addEventListener('visibilitychange',refresh);
  refresh();
}
try { createStage(); } catch(error) { console.info('Affiche fixe activée',error.message); }
