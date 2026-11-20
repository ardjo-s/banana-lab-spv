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

const stage = document.querySelector('#stage');
const stepsButtons = [...document.querySelectorAll('[data-step]')];
const playButton = document.querySelector('.play');
let currentStep = 0;
let timer;

function showStep(index) {
  currentStep = index;
  const step = steps[index];
  document.querySelector('#step-kicker').textContent = step.kicker;
  document.querySelector('#step-title').textContent = step.title;
  document.querySelector('#step-text').textContent = step.text;
  document.querySelector('#step-balance').textContent = step.balance + ' €';
  stepsButtons.forEach((button, i) => button.setAttribute('aria-pressed', i === index));
  stage.dataset.step = index;
  stage.dispatchEvent(new CustomEvent('route-step', { detail: index }));
}

function setPlaying(playing) {
  clearTimeout(timer);
  timer = undefined;
  playButton.setAttribute('aria-pressed', playing);
  playButton.innerHTML = playing
    ? '<span aria-hidden="true">Ⅱ</span> Pause'
    : '<span aria-hidden="true">▶</span> Lire le trajet';
}

stepsButtons.forEach((button, index) => button.addEventListener('click', () => {
  setPlaying(false);
  showStep(index);
}));

function advance() {
  if (currentStep === steps.length - 1) {
    setPlaying(false);
    return;
  }
  showStep(currentStep + 1);
  timer = setTimeout(advance, 3600);
}

playButton.addEventListener('click', () => {
  if (timer) {
    setPlaying(false);
    return;
  }
  setPlaying(true);
  if (currentStep === steps.length - 1 || currentStep === 0) {
    showStep(0);
    timer = setTimeout(advance, 2600);
  } else {
    advance();
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) setPlaying(false);
});

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
