const { test, expect } = require('@playwright/test');
const STORAGE = 'omoi-for-us:game:v1';
const snapshot = page => page.evaluate(key => JSON.parse(sessionStorage.getItem(key)), STORAGE);
async function enterSetup(page) {
  await expect(page.locator('[data-action="intro-next"], [data-action="start"]')).toBeVisible();
  if (await page.locator('[data-action="intro-next"]').count()) await page.locator('[data-action="intro-next"]').click();
  await expect(page.locator('[data-action="start"]')).toBeVisible();
}
async function openSetup(page, path = '/us/') {
  await page.goto(path);
  await enterSetup(page);
}
async function start(page, count = 2, deck = 'family', rounds = 1) {
  await openSetup(page, `/us/?deck=${deck}`);
  while (await page.locator('[data-name-index]').count() > count) await page.locator('[data-action="remove-player"]').last().click();
  while (await page.locator('[data-name-index]').count() < count) await page.locator('[data-action="add-player"]').click();
  await page.locator(`[data-rounds="${rounds}"]`).click();
  await page.locator('[data-action="start"]').click();
  await expect(page.locator('[data-choice]')).toHaveCount(3);
}
async function reveal(page, choice = '2') {
  await page.locator(`[data-choice="${choice}"]`).click();
  await expect(page.locator('.us-revealed')).toHaveCount(0);
  await page.locator('[data-action="reveal"]').click();
  await expect(page.locator('.us-revealed')).toBeVisible();
}
async function complete(page, allCorrect = true) {
  await reveal(page);
  if (allCorrect) await page.locator('[data-action="toggle-all-correct"]').click();
  await page.locator('[data-action="advance"]').click();
}

test('the hub has one Us entry and keeps the other three series', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.hub-links a')).toHaveCount(4);
  await page.locator('.hub-links a[href="us/"]').click();
  await expect(page.getByRole('heading', { name: '遊び方', exact: true })).toBeVisible();
  await enterSetup(page);
  await expect(page.getByRole('heading', { name: /知っているつもり/ })).toBeVisible();
  await expect(page.locator('[data-name-index]')).toHaveCount(4);
});

test('Us loads both bundled font weights without external requests or console errors', async ({ page }) => {
  const external = [], errors = [];
  page.on('request', request => { if (!['127.0.0.1', 'localhost'].includes(new URL(request.url()).hostname)) external.push(request.url()); });
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await openSetup(page);
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => Array.from(document.fonts).filter(font => font.family.includes('Omoi Us UI') && font.status === 'loaded').length)).toBe(2);
  expect(external).toEqual([]); expect(errors).toEqual([]);
});

test('deleting a middle person and adding another creates unique names and starts', async ({ page }) => {
  await openSetup(page);
  await page.locator('[data-action="remove-player"][data-index="1"]').click();
  await page.locator('[data-action="add-player"]').click();
  const names = await page.locator('[data-name-index]').evaluateAll(inputs => inputs.map(input => input.value));
  expect(new Set(names).size).toBe(4);
  await page.locator('[data-action="start"]').click();
  await expect(page.locator('[data-choice]')).toHaveCount(3);
});

test('the main player commits on screen and the guess screen reveals no selected mark, including after reload', async ({ page }) => {
  await start(page);
  await expect(page.locator('.us-instruction')).toContainText('さんだけが画面を見て');
  await page.locator('[data-choice="2"]').click();
  expect((await snapshot(page)).answer).toBe('2');
  expect((await snapshot(page)).screen).toBe('guess');
  await expect(page.locator('[data-choice], .us-revealed')).toHaveCount(0);
  await expect(page.locator('#question-card [aria-pressed="true"], #question-card [aria-selected="true"]')).toHaveCount(0);
  await expect(page.locator('.question-card-front .us-option')).toHaveCount(3);
  await page.reload();
  await expect(page.locator('[data-action="reveal"]')).toBeVisible();
  await expect(page.locator('.us-notice')).toHaveCount(0);
  await expect(page.locator('[data-choice], .us-revealed')).toHaveCount(0);
  await page.locator('[data-action="reselect"]').click();
  expect((await snapshot(page)).answer).toBeNull();
  await page.locator('[data-choice="3"]').click();
  await page.locator('[data-action="reveal"]').click();
  await expect(page.locator('.us-revealed .us-choice-number')).toHaveText('3');
  await expect(page.locator('[data-action="reselect"], [data-choice]')).toHaveCount(0);
});

test('six people complete exactly one prediction each in 24 clicks and keep no answer history', async ({ page }) => {
  await start(page, 6); let clicks = 0;
  const click = async locator => { await locator.click(); clicks++; };
  for (let turn = 0; turn < 6; turn++) {
    await click(page.locator('[data-choice="1"]'));
    await click(page.locator('[data-action="reveal"]'));
    await click(page.locator('[data-action="toggle-all-correct"]'));
    await expect(page.locator('[data-player-id][aria-pressed="true"]')).toHaveCount(5);
    await click(page.locator('[data-action="advance"]'));
  }
  expect(clicks).toBe(24);
  await expect(page.getByRole('heading', { name: '今回の結果', exact: true })).toBeVisible();
  expect(await page.locator('.us-rank-score').allTextContents()).toEqual(Array(6).fill('5点'));
  await page.getByText('問いを振り返る', { exact: true }).click();
  await expect(page.locator('.us-discoveries li')).toHaveCount(6);
  const stored = await snapshot(page);
  expect(stored.answer).toBeNull();
  expect(stored.completedTurns.every(turn => Object.keys(turn).sort().join(',') === 'correctIds,playerId,questionId')).toBe(true);
});

test('the optional condition flips the same card and adds neither a second guess nor points', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await start(page); await reveal(page);
  await page.locator('[data-player-id="p2"]').click();
  await page.evaluate(() => { window.usCardBeforeFlip = document.querySelector('#question-card'); });
  await page.locator('[data-action="toggle-condition"]').click();
  expect(await page.evaluate(() => window.usCardBeforeFlip === document.querySelector('#question-card'))).toBe(true);
  await expect(page.locator('.question-card-front')).toHaveAttribute('aria-hidden', 'true');
  expect(await page.locator('.question-card-front').evaluate(face => face.inert)).toBe(true);
  await expect.poll(() => page.locator('.question-card-inner').evaluate(inner => Math.abs(new DOMMatrix(getComputedStyle(inner).transform).m11 + 1))).toBeLessThan(.001);
  await expect(page.locator('.question-card-back [data-choice]')).toHaveCount(0);
  await page.reload(); await expect(page.locator('.us-condition')).toBeVisible();
  expect((await snapshot(page)).correctIds).toEqual(['p2']);
  await page.locator('[data-action="toggle-condition"]').click();
  await expect(page.locator('.question-card-front')).toHaveAttribute('aria-hidden', 'false');
  await page.locator('[data-action="advance"]').click();
  await expect(page.locator('.us-progress')).toContainText('2 / 2');
  expect((await snapshot(page)).completedTurns[0].correctIds).toEqual(['p2']);
  await complete(page, false);
  expect(await page.locator('.us-rank-score').allTextContents()).toEqual(['1点', '0点']);
});

test('larger display persists and every state fits narrow screens', async ({ page }) => {
  await start(page);
  await page.locator('[data-action="toggle-large-text"]').click();
  expect((await page.locator('.card-stage').boundingBox()).width).toBeGreaterThan(340);
  expect(await page.locator('[data-choice="1"]').evaluate(button => parseFloat(getComputedStyle(button).fontSize))).toBeGreaterThanOrEqual(20);
  await page.reload(); await expect(page.locator('[data-action="toggle-large-text"]')).toHaveAttribute('aria-pressed', 'true');
  await page.setViewportSize({ width: 320, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await reveal(page); await page.locator('[data-action="toggle-condition"]').click();
  await expect(page.locator('.us-condition')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

for (const version of [1, 2]) test(`old format ${version} recovers with an update notice`, async ({ page }) => {
  await start(page);
  await page.evaluate(({ key, version }) => { const game = JSON.parse(sessionStorage.getItem(key)); game.version = version; sessionStorage.setItem(key, JSON.stringify(game)); }, { key: STORAGE, version });
  await page.reload(); await expect(page.locator('[data-action="start"]')).toBeVisible();
  await expect(page.locator('.us-notice')).toContainText('更新'); expect(await snapshot(page)).toBeNull();
});

for (const deck of ['family', 'friends']) test(`both archived ${deck} routes preselect the matching deck`, async ({ page }) => {
  for (const suffix of ['/', '/howto.html']) {
    await page.goto(`/${deck}${suffix}`);
    await page.locator(`a[href="../us/?deck=${deck}"]`).click();
    await enterSetup(page);
    await expect(page.locator(`[data-deck="${deck}"]`)).toHaveAttribute('aria-pressed', 'true');
  }
});

test('two players can resume a revealed answer, finish once, tie and replay', async ({ page }) => {
  await start(page); await reveal(page);
  await page.locator('[data-player-id="p2"]').click();
  await page.reload(); await expect(page.locator('[data-player-id="p2"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-action="advance"]').click();
  await complete(page);
  expect(await page.locator('.us-rank-score').allTextContents()).toEqual(['1点', '1点']);
  expect(await page.locator('.us-rank').allTextContents()).toEqual(['1位', '1位']);
  await page.locator('[data-action="again"]').click();
  expect((await snapshot(page)).completedTurns).toEqual([]);
  await expect(page.locator('[data-choice]')).toHaveCount(3);
});

for (const count of [4, 6]) test(`${count} participants complete one turn each with nobody scoring`, async ({ page }) => {
  await start(page, count);
  for (let turn = 0; turn < count; turn++) { await expect(page.locator('.us-progress')).toContainText(`${turn + 1} / ${count}`); await complete(page, false); }
  expect(await page.locator('.us-rank-score').allTextContents()).toEqual(Array(count).fill('0点'));
});

test('pass and early finish discard the unfinished turn but preserve completed points', async ({ page }) => {
  await start(page, 3); await complete(page);
  const id = (await snapshot(page)).questionId;
  await reveal(page); await page.locator('[data-player-id="p1"]').click(); await page.locator('[data-action="pass"]').click();
  expect((await snapshot(page)).questionId).not.toBe(id);
  expect((await snapshot(page)).turnIndex).toBe(1);
  expect((await snapshot(page)).answer).toBeNull();
  await page.locator('[data-action="finish"]').click(); await page.locator('[data-action="confirm-finish"]').click();
  expect(await page.locator('.us-rank-score').allTextContents()).toEqual(['0点', '1点', '1点']);
  await expect(page.locator('.us-rank')).toHaveCount(0);
});

test('damaged saved progress recovers to setup', async ({ page }) => {
  await page.addInitScript(key => sessionStorage.setItem(key, '{bad'), STORAGE);
  await openSetup(page);
  await expect(page.locator('.us-notice')).toContainText('前のゲームを読み込めませんでした。');
});

test('a different-deck link parks the previous secret answer until the user chooses a game', async ({ page }) => {
  await start(page, 2, 'family'); await page.locator('[data-choice="2"]').click();
  await page.goto('/us/?deck=friends'); await expect(page.locator('[data-deck="friends"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-action="resume"]').click();
  await expect(page.locator('[data-action="reveal"]')).toBeVisible();
  await expect(page.locator('.us-revealed')).toHaveCount(0);
  expect((await snapshot(page)).answer).toBe('2');
  await page.goto('/us/?deck=friends'); await page.locator('[data-action="start"]').click();
  expect((await snapshot(page)).audience).toBe('friends');
});

test('blocked storage still permits in-memory private choice and reveal', async ({ page }) => {
  await page.addInitScript(() => { Storage.prototype.getItem = () => { throw new Error('blocked'); }; Storage.prototype.setItem = () => { throw new Error('blocked'); }; });
  await start(page); await reveal(page);
  await expect(page.locator('.us-notice')).toContainText('再読み込みするとゲームが終了します');
});

test('production cannot play the pending dataset', async ({ page, baseURL }) => {
  await page.route('https://omoi-for.viuk-light.org/**', async route => { const url = new URL(route.request().url()); const response = await route.fetch({ url: new URL(url.pathname + url.search, baseURL).href }); await route.fulfill({ response }); });
  await page.goto('https://omoi-for.viuk-light.org/us/'); await expect(page.getByRole('heading', { name: '公開準備中です。', exact: true })).toBeVisible();
});

for (const width of [320, 390, 768, 1280]) test(`all game states including entrance motion fit ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 844 }); await start(page, 4);
  const widths = await page.evaluate(async () => { const values = [], until = performance.now() + 450; do { values.push(document.documentElement.scrollWidth); await new Promise(requestAnimationFrame); } while (performance.now() < until); return values; });
  expect(Math.max(...widths)).toBeLessThanOrEqual(width);
  await page.locator('[data-choice="1"]').click(); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('[data-action="reveal"]').click(); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('[data-action="toggle-condition"]').click(); await expect(page.locator('.us-condition')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('names stay escaped and long labels fit on a small screen', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 }); await openSetup(page);
  await page.locator('[data-name-index="0"]').fill('<img src=x>'); await page.locator('[data-name-index="1"]').fill('あいうえおかきくけこさしすせそた');
  await page.locator('[data-action="start"]').click(); await expect(page.locator('#us-main img')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('keyboard play covers private selection, reveal, scoring and optional discussion with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await start(page);
  await page.keyboard.press('Tab'); await expect(page.locator('[data-choice="1"]')).toBeFocused(); await page.keyboard.press('Enter');
  await page.keyboard.press('Tab'); await expect(page.locator('[data-action="reveal"]')).toBeFocused(); await page.keyboard.press('Enter');
  await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); await expect(page.locator('[data-player-id="p2"]')).toBeFocused();
  await page.keyboard.press('Space'); await expect(page.locator('[data-player-id="p2"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-action="toggle-condition"]').focus(); await page.keyboard.press('Enter'); await expect(page.locator('.us-condition')).toBeVisible();
  expect(await page.locator('.question-card-inner').evaluate(inner => getComputedStyle(inner).transitionDuration)).toBe('0s');
  await page.locator('[data-action="finish"]').focus(); await page.keyboard.press('Enter'); await page.keyboard.press('Escape');
  await expect(page.locator('[data-action="finish"]')).toBeFocused();
});

test('Couples, Adults and Self-Care retain their existing card flows', async ({ page }) => {
  for (const series of ['couples', 'adults', 'self-care']) {
    await page.goto(`/${series}/`); await expect(page.locator('[data-action="start"]')).toBeEnabled();
    if (series === 'adults') await page.locator('[data-intensity="deep"]').click();
    await page.locator('[data-action="start"]').click(); if (series === 'adults') await page.locator('[data-action="confirm-deep"]').click();
    await expect(page.locator('#question-card')).toBeVisible(); await page.locator('[data-action="reveal"]').click();
    await expect(page.locator('.question-card-back')).toHaveAttribute('aria-hidden', 'false');
    await page.locator('[data-action="finish"]').click(); await expect(page.getByRole('heading', { name: 'おつかれさま' })).toBeVisible();
  }
});

test('first entry shows four rules before setup and remembers dismissal in the same tab', async ({ page }) => {
  await page.goto('/us/?deck=friends');
  await expect(page.getByRole('heading', { name: '遊び方', exact: true })).toBeVisible();
  await expect(page.locator('.us-tutorial li')).toHaveCount(4);
  await expect(page.locator('[data-name-index], [data-action="start"]')).toHaveCount(0);
  await page.locator('[data-action="intro-next"]').click();
  await expect(page.locator('[data-deck="friends"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-rounds="3"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#us-rounds-help')).toHaveText('1人3回ずつ主役・全12問');
  await page.reload();
  await expect(page.locator('[data-action="start"]')).toBeVisible();
  await expect(page.locator('.us-tutorial')).toHaveCount(0);
});

test('reviewing the rules preserves names, deck and chosen length', async ({ page }) => {
  await openSetup(page);
  await page.locator('[data-name-index="0"]').fill('アキ');
  await page.locator('[data-deck="friends"]').click();
  await page.locator('[data-rounds="5"]').click();
  await expect(page.locator('#us-rounds-help')).toHaveText('1人5回ずつ主役・全20問');
  await page.locator('[data-action="show-intro"]').click();
  await expect(page.locator('.us-tutorial li')).toHaveCount(4);
  await page.locator('[data-action="intro-next"]').click();
  await expect(page.locator('[data-name-index="0"]')).toHaveValue('アキ');
  await expect(page.locator('[data-deck="friends"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-rounds="5"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-action="start"]').click();
  expect((await snapshot(page)).rounds).toBe(5);
  await expect(page.locator('.us-progress')).toContainText('1 / 5 周目');
});

test('three rounds rotate fairly and another round retains scores, draws and silent resume', async ({ page }) => {
  await openSetup(page);
  while (await page.locator('[data-name-index]').count() > 2) await page.locator('[data-action="remove-player"]').last().click();
  await expect(page.locator('#us-rounds-help')).toHaveText('1人3回ずつ主役・全6問');
  await page.locator('[data-action="start"]').click();
  const seen = new Set();
  for (let turn = 0; turn < 6; turn++) {
    await expect(page.locator('.us-progress')).toContainText(`${Math.floor(turn / 2) + 1} / 3 周目`);
    await expect(page.locator('.us-progress')).toContainText(`${turn % 2 + 1} / 2 人目`);
    const state = await snapshot(page);
    expect(seen.has(state.questionId)).toBe(false); seen.add(state.questionId);
    if (turn === 2) {
      await page.reload();
      await expect(page.locator('[data-choice]')).toHaveCount(3);
      await expect(page.locator('.us-notice')).toHaveCount(0);
    }
    await complete(page);
  }
  await expect(page.locator('.us-rank-score')).toHaveText(['3点', '3点']);
  await page.locator('[data-action="continue"]').click();
  await expect(page.locator('.us-progress')).toContainText('4 / 4 周目');
  expect((await snapshot(page)).completedTurns).toHaveLength(6);
  expect(seen.has((await snapshot(page)).questionId)).toBe(false);
  await complete(page); await complete(page);
  await expect(page.locator('.us-rank-score')).toHaveText(['4点', '4点']);
  await page.locator('[data-action="again"]').click();
  expect((await snapshot(page)).rounds).toBe(3);
  expect((await snapshot(page)).completedTurns).toEqual([]);
});

test('version 3 can resume without resetting progress or displaying a resume banner', async ({ page }) => {
  await start(page); await page.locator('[data-choice="3"]').click();
  await page.evaluate(key => {
    const game = JSON.parse(sessionStorage.getItem(key));
    game.version = 3; delete game.rounds; delete game.initialRounds;
    sessionStorage.setItem(key, JSON.stringify(game));
  }, STORAGE);
  await page.reload();
  await expect(page.locator('[data-action="reveal"]')).toBeVisible();
  await expect(page.locator('.us-notice, .us-tutorial')).toHaveCount(0);
  await page.locator('[data-action="reveal"]').click();
  await expect(page.locator('.us-revealed .us-choice-number')).toHaveText('3');
  expect((await snapshot(page)).rounds).toBe(1);
});

test('reloading an extended game preserves the originally chosen length for a fresh game', async ({ page }) => {
  await start(page, 2, 'friends', 1);
  await complete(page); await complete(page);
  await page.locator('[data-action="continue"]').click();
  await complete(page); await complete(page);
  await page.reload();
  await expect(page.locator('.us-rank-score')).toHaveText(['2点', '2点']);
  await expect(page.locator('.us-notice')).toHaveCount(0);
  await page.getByRole('link', { name: '遊び方', exact: true }).click();
  await expect(page).toHaveURL(/\/us\/howto.html$/);
  await page.locator('header .us-text-link').click();
  await expect(page.locator('.us-rank-score')).toHaveText(['2点', '2点']);
  await page.locator('[data-action="again"]').click();
  expect((await snapshot(page)).rounds).toBe(1);
  expect((await snapshot(page)).completedTurns).toEqual([]);
  await expect(page.locator('.us-progress')).toContainText('1 / 1 周目');
});
