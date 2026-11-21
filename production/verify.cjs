// PLAYWRIGHT may point to an existing Playwright installation.
const assert = require('node:assert/strict');
const { chromium, webkit } = require(process.env.PLAYWRIGHT || 'playwright');
const engine = process.argv.includes('--webkit') ? webkit : chromium;

const clips = ['depart', 'achat', 'marche', 'vente'];
const balances = ['30 €', '18 €', '14 €', '34 €'];
const url = process.argv[2];
if (!url) throw new Error('Passer l’adresse du site en argument.');

async function waitForPlayback(page, selector) {
  await page.waitForFunction(selector => {
    const player = document.querySelector(selector);
    return !player.paused && player.currentTime > .08 && player.videoWidth > 0;
  }, selector);
}

async function checkViewport(browser, width) {
  const page = await browser.newPage({ viewport: { width, height: 850 } });
  const failures = [];
  const requests = [];
  page.on('pageerror', error => failures.push(error.message));
  page.on('request', request => requests.push(request.url()));
  page.on('response', response => { if (response.status() >= 400) failures.push(response.url()); });
  await page.goto(url);
  await waitForPlayback(page, '#cover-film');
  const cover = page.locator('#cover-film');
  await page.locator('.hero-motion').click();
  const stopped = await cover.evaluate(video => video.currentTime);
  await page.waitForTimeout(200);
  assert.equal(await cover.evaluate(video => video.currentTime), stopped);
  await page.locator('.hero-motion').click();
  await waitForPlayback(page, '#cover-film');

  await page.locator('.primary').click();
  const route = page.locator('#route-film');
  for (let index = 0; index < clips.length; index++) {
    await page.locator('[data-step="' + index + '"]').click();
    await waitForPlayback(page, '#route-film');
    assert((await route.evaluate(video => new URL(video.currentSrc).pathname)).endsWith('/' + clips[index] + '.mp4'));
    assert.equal(await page.locator('#step-balance').innerText(), balances[index]);
  }
  await page.locator('.clip-motion').click();
  assert(await route.evaluate(video => video.paused));
  await page.locator('.play').click();
  await waitForPlayback(page, '#route-film');
  // Accelerate decoding, while still advancing exclusively on real ended events.
  await route.evaluate(video => { video.defaultPlaybackRate = 3; video.playbackRate = 3; });
  await page.waitForFunction(() => document.querySelector('[data-step="2"]').getAttribute('aria-pressed') === 'true');
  await page.locator('.play').click();
  assert(await route.evaluate(video => video.paused));
  await page.locator('.play').click();
  await page.waitForFunction(() => document.querySelector('[data-step="3"]').getAttribute('aria-pressed') === 'true' &&
    document.querySelector('#route-film').ended && document.querySelector('.play').getAttribute('aria-pressed') === 'false');
  await page.locator('[data-sales="3"]').click();
  assert.equal(await page.locator('#profit').innerText(), '−10 €');
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert(!requests.some(request => /three\.min|cover\.js|scene\.js|minions\.js/.test(request)));
  assert.deepEqual(failures, []);
  await page.close();
  console.log(width + ' px · ouverture, quatre clips, enchaînement, pauses et soldes validés');
}

(async () => {
  const browser = await engine.launch();
  try {
    for (const width of [1440, 390]) await checkViewport(browser, width);
    const page = await browser.newPage({ reducedMotion: 'reduce' });
    const movies = [];
    page.on('request', request => { if (new URL(request.url()).pathname.endsWith('.mp4')) movies.push(request.url()); });
    await page.goto(url);
    await page.locator('.primary').click();
    for (let index = 0; index < clips.length; index++) {
      await page.locator('[data-step="' + index + '"]').click();
      assert((await page.locator('#route-film').evaluate(video => new URL(video.poster).pathname)).endsWith(clips[index] + '.webp'));
    }
    assert.equal(movies.length, 0);
    await page.locator('.clip-motion').click();
    await waitForPlayback(page, '#route-film');
    assert.equal(movies.length > 0, true);
    console.log('Mouvement réduit · affiches seules puis lecture explicite validée');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
