const steps = [
  {
    kicker: '01 / LES APPORTS',
    title: 'Les Minions lancent le stand.',
    text: 'Kevin prépare la caisse de bananes. Pour lancer le stand, les trois Minions apportent 30 € à leur nouvelle société. En échange, ils en possèdent des parts.',
    balance: 30
  },
  {
    kicker: '02 / LA COMMANDE',
    title: 'Le SPV achète les bananes.',
    text: 'La société paie 12 € au fournisseur pour dix bananes. Stuart porte la caisse jusqu’à la réserve. Le stock appartient désormais à la société du stand.',
    balance: 18
  },
  {
    kicker: '03 / LES FRAIS',
    title: 'Les bananes arrivent au marché.',
    text: 'La société paie 4 € pour la place au marché. Stuart apporte la caisse et Bob dispose les bananes sur le comptoir.',
    balance: 14
  },
  {
    kicker: '04 / LA RECETTE',
    title: 'Les clients paient le stand.',
    text: 'Bob remet les bananes au client. Dix bananes à 2 € rapportent 20 € à la société. Elle a 34 € en caisse, soit 4 € de plus qu’au départ.',
    balance: 34
  }
];

const clips = [
  ['depart', 'Kevin soulève un régime et le dépose dans la caisse du fournisseur.'],
  ['achat', 'Stuart porte la caisse de bananes vers la réserve du SPV.'],
  ['marche', 'Stuart apporte la caisse au stand et Bob dispose les bananes sur le comptoir.'],
  ['vente', 'Bob donne les bananes au client et reçoit sa pièce en échange.']
];
const stepsButtons = [...document.querySelectorAll('[data-step]')];
const cover = document.querySelector('#cover-film');
const route = document.querySelector('#route-film');
const coverButton = document.querySelector('.hero-motion');
const clipButton = document.querySelector('.clip-motion');
const playButton = document.querySelector('.play');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const visible = new Set();
const wanted = new Map([[cover, !motion.matches], [route, !motion.matches]]);
let currentStep = 0;
let sequence = false;

function filmAsset(clip, extension) {
  return 'assets/film/' + clip + '.' + extension + (clip === 'cover' ? '?v=signe4' : '?v=jeu2');
}

function labels() {
  coverButton.textContent = cover.paused ? 'Lire la scène' : 'Mettre en pause';
  clipButton.textContent = route.ended ? 'Revoir le plan' : route.paused ? 'Lire le plan' : 'Pause';
  playButton.setAttribute('aria-pressed', String(sequence));
  playButton.innerHTML = sequence
    ? '<span aria-hidden="true">Ⅱ</span> Pause du trajet'
    : '<span aria-hidden="true">▶</span> Lire le trajet';
}

function sync(video) {
  if (!wanted.get(video) || document.hidden || !visible.has(video)) {
    video.pause();
    return;
  }
  if (!video.getAttribute('src')) {
    video.src = filmAsset(video === cover ? 'cover' : clips[currentStep][0], 'mp4');
  }
  const source = video.src;
  video.play().catch(error => {
    if (error.name !== 'AbortError' && video.src === source) {
      wanted.set(video, false);
      if (video === route) sequence = false;
      labels();
    }
  });
}

function showStep(index) {
  currentStep = index;
  const step = steps[index];
  document.querySelector('#step-kicker').textContent = step.kicker;
  document.querySelector('#step-title').textContent = step.title;
  document.querySelector('#step-text').textContent = step.text;
  document.querySelector('#step-balance').textContent = step.balance + ' €';
  stepsButtons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
  route.pause();
  route.removeAttribute('src');
  route.poster = filmAsset(clips[index][0], 'webp');
  route.setAttribute('aria-label', clips[index][1]);
  route.load();
  wanted.set(route, sequence || !motion.matches);
  sync(route);
  labels();
}

function revealRoute() {
  const rect = route.getBoundingClientRect();
  const visibleHeight = Math.min(rect.bottom, innerHeight) - Math.max(rect.top, 0);
  if (visibleHeight < Math.min(rect.height, innerHeight) * .45) {
    route.scrollIntoView({ block: 'center', behavior: motion.matches ? 'instant' : 'smooth' });
  }
}

function toggleClip(video) {
  if (video === route) sequence = false;
  if (video.ended) video.currentTime = 0;
  wanted.set(video, video.paused);
  sync(video);
  labels();
}

coverButton.addEventListener('click', () => toggleClip(cover));
clipButton.addEventListener('click', () => toggleClip(route));
stepsButtons.forEach((button, index) => button.addEventListener('click', () => {
  sequence = false;
  showStep(index);
  revealRoute();
}));
playButton.addEventListener('click', () => {
  sequence = !sequence;
  if (sequence) {
    revealRoute();
    if (currentStep === steps.length - 1 || route.ended) showStep(0);
    wanted.set(route, true);
  } else wanted.set(route, false);
  sync(route);
  labels();
});
route.addEventListener('ended', () => {
  if (sequence && currentStep < clips.length - 1) showStep(currentStep + 1);
  else {
    sequence = false;
    wanted.set(route, false);
    labels();
  }
});
const observe = new IntersectionObserver(entries => {
  for (const { target, isIntersecting } of entries) {
    if (isIntersecting) visible.add(target);
    else visible.delete(target);
    sync(target);
  }
});
for (const video of [cover, route]) {
  observe.observe(video);
  for (const event of ['play', 'pause', 'ended']) video.addEventListener(event, labels);
}
coverButton.hidden = clipButton.hidden = false;
motion.addEventListener('change', () => {
  sequence = false;
  for (const video of [cover, route]) {
    wanted.set(video, !motion.matches);
    sync(video);
  }
  labels();
});
document.addEventListener('visibilitychange', () => {
  sync(cover);
  sync(route);
});
labels();

const salesButtons = [...document.querySelectorAll('[data-sales]')];
salesButtons.forEach(button => button.addEventListener('click', () => {
  const revenue = Number(button.dataset.sales) * 2;
  const profit = revenue - 16;
  salesButtons.forEach(option => option.setAttribute('aria-pressed', option === button));
  document.querySelector('#revenue').textContent = revenue + ' €';
  document.querySelector('#profit').textContent = (profit < 0 ? '−' : '+') + Math.abs(profit) + ' €';
  document.querySelector('.figures').toggleAttribute('data-loss', profit < 0);
  document.querySelector('#outcome').textContent = profit < 0
    ? 'Le stand perd 10 €. Sa caisse tombe à 20 €, sous les 30 € apportés au départ. La perte réduit la valeur de la mise des associés.'
    : 'Les ventes couvrent les dépenses. Le SPV fait 4 € de bénéfice, avant impôts, et sa caisse passe de 30 € à 34 €.';
}));
