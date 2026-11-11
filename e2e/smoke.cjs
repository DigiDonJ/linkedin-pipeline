// End-to-end smoke test. Usage: node e2e/smoke.cjs [url] [private-data.json]
// Walks one card through the whole pipeline, checks it survives a reload and an export/import round trip.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const URL_ = process.argv[2] || 'http://localhost:4173/';
const DATA = process.argv[3];
const SHOTS = process.env.SHOTS;

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true, deviceScaleFactor: SHOTS ? 2 : 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const shot = async (name) => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, name + '.png') }); };
  const col = (name) => page.locator(`section.col[aria-label="${name}"]`);
  const drag = async (from, to) => {
    const a = await from.boundingBox(), b = await to.boundingBox();
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(a.x + a.width / 2 + 12, a.y + a.height / 2 + 12, { steps: 3 });
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 });
    await page.mouse.up();
    // The drag library swallows clicks for 50ms after a drop, so a robot must wait where a person could not be that fast.
    await page.waitForTimeout(120);
  };

  await page.goto(URL_);
  await page.getByText('You are looking at example data').waitFor();
  assert.equal(await page.locator('section.col').count(), 5, 'five columns by default');
  await shot('01-board-demo');

  // Add, edit, drag.
  await page.getByLabel('New idea').fill('Smoke test idea');
  await page.getByLabel('New idea').press('Enter');
  const card = page.locator('button.card', { hasText: 'Smoke test idea' });
  await col('Ideas').locator(card).waitFor();
  await card.click();
  const drawer = page.getByLabel('Card details');
  await drawer.getByLabel('Title').fill('Smoke test post');
  await drawer.getByLabel('Pillar').selectOption('P2');
  await drawer.getByLabel(/^Draft/).fill('One two three four five.');
  await drawer.getByText('5 words').waitFor();
  await page.keyboard.press('Escape');
  await drawer.waitFor({ state: 'detached' });
  const post = page.locator('button.card', { hasText: 'Smoke test post' });
  await drag(post, col('Drafted').locator('.col__body'));
  await col('Drafted').locator(post).waitFor();
  await page.getByRole('status').getByText('Moved to Drafted.').waitFor();

  // Undo and redo the move by hand.
  await page.getByRole('button', { name: 'Undo' }).click();
  await col('Ideas').locator(post).waitFor();
  await drag(post, col('Drafted').locator('.col__body'));
  await col('Drafted').locator(post).waitFor();

  // Schedule from the calendar.
  await page.getByRole('button', { name: 'Calendar', exact: true }).click();
  const today = await page.locator('.day[data-today]').getAttribute('data-date');
  await drag(page.locator('.tray .evt', { hasText: 'Smoke test post' }), page.locator(`.day[data-date="${today}"]`));
  await page.locator(`.day[data-date="${today}"] .evt--sched`, { hasText: 'Smoke test post' }).waitFor();
  await shot('03-calendar');

  // Publish and measure from the drawer.
  await page.getByRole('button', { name: 'Board', exact: true }).click();
  await col('Scheduled').locator(post).click();
  await drawer.getByRole('button', { name: 'Move to Published' }).click();
  await drawer.getByLabel('Impressions').fill('99999');
  await drawer.getByLabel('Read on day').fill('7');
  await drawer.getByRole('button', { name: 'Move to Measured' }).click();
  await shot('02-drawer');
  await drawer.getByLabel('Close details').click();
  await col('Measured').locator(post).getByText('99,999 impr · day 7').waitFor();
  assert.ok(await col('Measured').locator(post).locator('.tag--gold').count(), 'top post is gold');
  assert.equal(await page.locator('.tag--gold').count(), 1, 'exactly one gold tag on the board');

  // Persists across reload.
  await page.reload();
  await col('Measured').locator(post).waitFor();

  // Filters.
  await page.getByRole('button', { name: 'P2', exact: true }).click();
  assert.ok(await post.count());
  await page.getByRole('button', { name: 'P4', exact: true }).click();
  assert.equal(await post.count(), 0, 'pillar filter hides other pillars');
  await page.getByRole('button', { name: 'All pillars' }).click();
  await page.getByLabel('Search').fill('three four');
  assert.equal(await page.locator('button.card').count(), 1, 'search reaches the draft text');
  await page.getByLabel('Search').fill('');
  await page.getByRole('button', { name: 'Stale', exact: true }).click();
  assert.equal(await page.locator('section.col').count(), 6, 'stale column appears');
  await page.getByRole('button', { name: 'Stale', exact: true }).click();

  // Analytics.
  await page.getByRole('button', { name: 'Analytics', exact: true }).click();
  await page.locator('.top-posts li').first().getByText('99,999').waitFor();
  assert.equal(await page.locator('.top-posts__fig--gold').count(), 1);
  await shot('04-analytics');

  // Export, clear, import: identical.
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem('linkedin-pipeline')).state.items);
  await page.getByRole('button', { name: 'Data', exact: true }).click();
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Export JSON/ }).click()]);
  const file = await dl.path();
  await page.getByRole('button', { name: 'Data', exact: true }).click();
  const [csv] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Export CSV/ }).click()]);
  const csvFile = path.join(path.dirname(file), 'export.csv');
  await csv.saveAs(csvFile);
  await page.getByRole('button', { name: 'Data', exact: true }).click();
  await page.getByRole('button', { name: 'Start empty' }).click();
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('linkedin-pipeline')).state.items.length), 0);
  for (const f of [file, csvFile]) {
    await page.getByRole('button', { name: 'Data', exact: true }).click();
    await page.getByRole('button', { name: 'Import and replace everything' }).click();
    await page.getByLabel('Import file').setInputFiles(f);
    await page.getByRole('status').getByText(`Imported ${before.length} items.`).waitFor();
    const after = await page.evaluate(() => JSON.parse(localStorage.getItem('linkedin-pipeline')).state.items);
    assert.deepEqual(after, before, 'round trip is lossless: ' + path.basename(f));
  }

  // A bad file is refused and changes nothing.
  const bad = path.join(path.dirname(file), 'bad.json');
  fs.writeFileSync(bad, '{"nope":true}');
  await page.getByRole('button', { name: 'Data', exact: true }).click();
  await page.getByRole('button', { name: 'Import and replace everything' }).click();
  await page.getByLabel('Import file').setInputFiles(bad);
  await page.getByRole('alert').getByText('No "items" list found').waitFor();
  await page.keyboard.press('Escape');

  if (DATA) {
    await page.getByRole('button', { name: 'Data', exact: true }).click();
    await page.getByRole('button', { name: 'Import and replace everything' }).click();
    await page.getByLabel('Import file').setInputFiles(DATA);
    await page.getByRole('status').getByText(/Imported \d+ items\./).waitFor();
    console.log('real data header:', (await page.locator('.top__title p').innerText()).trim());
    for (const v of ['Board', 'Calendar', 'Analytics']) {
      await page.getByRole('button', { name: v, exact: true }).click();
      await page.waitForTimeout(150);
      await shot('real-' + v.toLowerCase());
    }
    await page.getByRole('button', { name: 'Board', exact: true }).click();
    await page.locator('button.card').nth(20).click();
    await shot('real-drawer');
    await page.keyboard.press('Escape');
  }

  // Phone.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Board', exact: true }).click();
  await page.getByRole('tablist').waitFor();
  assert.equal(await page.locator('section.col').count(), 1, 'one column at a time on a phone');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'no sideways page scroll');
  await shot('phone-board');
  await page.locator('button.card').first().click();
  await shot('phone-drawer');
  await page.getByLabel('Close details').click();
  await page.getByRole('button', { name: 'Calendar', exact: true }).click();
  await shot('phone-calendar');
  await page.getByRole('button', { name: 'Analytics', exact: true }).click();
  await shot('phone-analytics');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'no sideways page scroll');

  await browser.close();
  assert.deepEqual(errors, [], 'no console errors');
  console.log('smoke test passed');
})().catch((e) => { console.error(e); process.exit(1); });
