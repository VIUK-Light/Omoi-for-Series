const { test, expect } = require('@playwright/test');

const STORAGE = 'omoi-for-us:game:v1';
const snapshot = page => page.evaluate(key => JSON.parse(sessionStorage.getItem(key)), STORAGE);

async function start(page, count = 2, deck = 'family') {
  await page.goto(`/us/?deck=${deck}`);
  await expect(page.getByRole('button', { name: 'はじめる', exact: true })).toBeVisible();
  while (await page.locator('[data-name-index]').count() > count) await page.locator('[data-action="remove-player"]').last().click();
  while (await page.locator('[data-name-index]').count() < count) await page.getByRole('button', { name: '人を追加', exact: true }).click();
  await page.getByRole('button', { name: 'はじめる', exact: true }).click();
  await expect(page.locator('.us-question')).toBeVisible();
}

async function phase(page, allCorrect = true) {
  await page.locator('[data-choice="2"]').click();
  if (allCorrect) {
    const choices = page.locator('[data-player-id]');
    for (let index = 0; index < await choices.count(); index++) await choices.nth(index).click();
  }
  await page.locator('[data-action="advance"]').click();
}

test('the hub has one Us entry and preserves the other three active series', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.hub-links a')).toHaveCount(4);
  await expect(page.locator('.hub-links a[href="us/"]')).toContainText('Us');
  await expect(page.locator('.hub-links a[href="family/"], .hub-links a[href="friends/"]')).toHaveCount(0);
  await page.locator('.hub-links a[href="us/"]').click();
  await expect(page).toHaveTitle(/Omoi for Us/);
  await expect(page.getByRole('heading', { name: /知っているつもり/ })).toBeVisible();
  await expect(page.locator('[data-name-index]')).toHaveCount(4);
  await expect(page.getByText('2〜6人・スマホ1台', { exact: true })).toBeVisible();
});

test('Us loads its bundled UD fonts without an external font service', async ({ page }) => {
  const external = [];
  const errors = [];
  page.on('request', request => { if (!new URL(request.url()).hostname.match(/^(127\.0\.0\.1|localhost)$/)) external.push(request.url()); });
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/us/');
  await expect(page.getByRole('button', { name: 'はじめる', exact: true })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => Array.from(document.fonts).filter(font => font.family.includes('Omoi Us UI') && font.status === 'loaded').length)).toBe(2);
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
});

test('removing a middle participant and adding another preserves unique names and starts normally', async ({ page }) => {
  await page.goto('/us/');
  await page.locator('[data-action="remove-player"][data-index="1"]').click();
  await page.locator('[data-action="add-player"]').click();
  const names = await page.locator('[data-name-index]').evaluateAll(inputs => inputs.map(input => input.value));
  expect(new Set(names).size).toBe(4);
  await page.locator('[data-action="start"]').click();
  await expect(page.locator('#question-card')).toBeVisible();
  await expect(page.locator('.us-error')).toHaveCount(0);
});

test('six people finish with 36 game clicks using all-correct and see discoveries without saved answer choices', async ({ page }) => {
  await start(page, 6);
  let clicks = 0;
  const click = async locator => { await locator.click(); clicks++; };
  for (let turn = 0; turn < 6; turn++) {
    await click(page.locator('[data-choice="1"]'));
    await click(page.locator('[data-action="toggle-all-correct"]'));
    await expect(page.locator('[data-player-id][aria-pressed="true"]')).toHaveCount(5);
    await click(page.locator('[data-action="advance"]'));
    await expect(page.locator('.question-card-back .us-first-answer .us-choice-number')).toHaveText('1');
    await page.reload();
    await expect(page.locator('.question-card-back .us-first-answer .us-choice-number')).toHaveText('1');
    await click(page.locator('[data-choice="2"]'));
    await expect(page.locator('.us-answer-change')).toHaveText('答えが変わった');
    await expect(page.locator('.us-revealed .us-choice-number')).toHaveText('2');
    await click(page.locator('[data-action="toggle-all-correct"]'));
    await click(page.locator('[data-action="advance"]'));
  }
  expect(clicks).toBe(36);
  await expect(page.locator('.us-discoveries')).toContainText('6人のうち、6人が条件で答えを変えました。');
  await page.getByText('問いを振り返る', { exact: true }).click();
  await expect(page.locator('.us-discoveries li')).toHaveCount(6);
  const stored = await snapshot(page);
  expect(stored.baseAnswer).toBeNull();
  expect(stored.answer).toBeNull();
  expect(stored.completedTurns.every(turn => !('answer' in turn) && !('baseAnswer' in turn))).toBe(true);
  expect(await page.locator('.us-rank-score').allTextContents()).toEqual(Array(6).fill('10点'));
});

test('larger display survives reload and fits narrow screens while keeping choices interactive', async ({ page }) => {
  await start(page, 2);
  await page.locator('[data-action="toggle-large-text"]').click();
  await expect(page.locator('[data-action="toggle-large-text"]')).toHaveAttribute('aria-pressed', 'true');
  expect((await page.locator('.card-stage').boundingBox()).width).toBeGreaterThan(340);
  expect(await page.locator('[data-choice="1"]').evaluate(button => parseFloat(getComputedStyle(button).fontSize))).toBeGreaterThanOrEqual(20);
  await page.reload();
  await expect(page.locator('[data-action="toggle-large-text"]')).toHaveAttribute('aria-pressed', 'true');
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.locator('[data-choice="1"]').click();
  await page.locator('[data-action="advance"]').click();
  await expect(page.locator('.us-condition')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('older game formats recover with an update notice instead of incomplete answer comparisons', async ({ page }) => {
  await start(page, 2);
  await page.evaluate(key => { const game = JSON.parse(sessionStorage.getItem(key)); game.version = 1; delete game.baseAnswer; sessionStorage.setItem(key, JSON.stringify(game)); }, STORAGE);
  await page.reload();
  await expect(page.locator('[data-action="start"]')).toBeVisible();
  await expect(page.locator('.us-notice')).toContainText('更新');
  expect(await snapshot(page)).toBeNull();
});

test('Us preserves the shared card when it flips and makes only the visible face interactive', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await start(page, 2);
  await page.locator('.card-stage').evaluate(stage => Promise.all(stage.getAnimations().map(animation => animation.finished)));
  const card = page.locator('#question-card');
  const bounds = await card.boundingBox();
  expect(bounds.width).toBeLessThanOrEqual(340);
  expect(bounds.height / bounds.width).toBeGreaterThanOrEqual(88 / 63 - .01);
  await expect(page.locator('.question-card-back')).toHaveAttribute('aria-hidden', 'true');
  expect(await page.locator('.question-card-back').evaluate(face => face.inert)).toBe(true);
  await page.evaluate(() => { window.usCardBeforeFlip = document.querySelector('#question-card'); });
  await expect(page.locator('.question-card-front [data-choice]')).toHaveCount(3);
  await expect(page.locator('.question-card-back [data-choice]')).toHaveCount(0);
  await page.locator('[data-choice="2"]').click();
  await page.locator('[data-action="advance"]').click();
  expect(await page.evaluate(() => window.usCardBeforeFlip === document.querySelector('#question-card'))).toBe(true);
  await expect(page.locator('.question-card-front')).toHaveAttribute('aria-hidden', 'true');
  expect(await page.locator('.question-card-front').evaluate(face => face.inert)).toBe(true);
  await expect.poll(() => page.locator('.question-card-inner').evaluate(inner => Math.abs(new DOMMatrix(getComputedStyle(inner).transform).m11 + 1))).toBeLessThan(.001);
  await expect(page.locator('.question-card-front [data-choice]')).toHaveCount(0);
  await expect(page.locator('.question-card-back [data-choice]')).toHaveCount(3);
});

for (const deck of ['family', 'friends']) {
  test(`both old ${deck} routes explain the move and preselect the matching Us deck`, async ({ page }) => {
    for (const suffix of ['/', '/howto.html']) {
      await page.goto(`/${deck}${suffix}`);
      await expect(page.getByRole('heading', { name: /Usに統合/ })).toBeVisible();
      const link = page.locator(`a[href="../us/?deck=${deck}"]`);
      await link.click();
      await expect(page.locator(`[data-deck="${deck}"]`)).toHaveAttribute('aria-pressed', 'true');
    }
  });
}

test('two players finish, resume a changed phase without duplicate points, tie, and replay', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await start(page, 2, 'friends');
  const firstId = await page.locator('.us-question').getAttribute('data-question-id');
  const choices = await page.locator('.us-option-text').allTextContents();
  await phase(page);
  await expect(page.getByRole('heading', { name: '条件が変わったら？' })).toBeVisible();
  await expect(page.locator('.us-question')).toHaveAttribute('data-question-id', firstId);
  expect(await page.locator('.us-option-text').allTextContents()).toEqual(choices);
  await page.reload();
  await expect(page.getByRole('heading', { name: '条件が変わったら？' })).toBeVisible();
  expect((await snapshot(page)).turnAwards.base).toEqual(['p2']);
  await phase(page);
  await expect(page.locator('.us-progress')).toContainText('2 / 2');
  await expect(page.locator('.us-question')).not.toHaveAttribute('data-question-id', firstId);
  await phase(page);
  await phase(page);
  await expect(page.getByRole('heading', { name: '今回の結果', exact: true })).toBeVisible();
  expect(await page.locator('.us-rank-score').allTextContents()).toEqual(['2点', '2点']);
  expect(await page.locator('.us-rank').allTextContents()).toEqual(['1位', '1位']);
  await page.reload();
  await expect(page.getByRole('heading', { name: '今回の結果', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'もう一度', exact: true }).click();
  expect((await snapshot(page)).completedTurns).toEqual([]);
  expect((await snapshot(page)).audience).toBe('friends');
  expect(errors).toEqual([]);
});

for (const count of [4, 6]) {
  test(`${count} participants can complete a full game with nobody scoring`, async ({ page }) => {
    await start(page, count);
    for (let turn = 0; turn < count; turn++) {
      await expect(page.locator('.us-progress')).toContainText(`${turn + 1} / ${count}`);
      await phase(page, false);
      await phase(page, false);
    }
    await expect(page.locator('.us-rank-row')).toHaveCount(count);
    expect(await page.locator('.us-rank-score').allTextContents()).toEqual(Array(count).fill('0点'));
  });
}

test('passing after a scored base phase redraws for the same main player and rolls back the turn', async ({ page }) => {
  await start(page);
  const oldId = await page.locator('.us-question').getAttribute('data-question-id');
  await phase(page);
  expect((await snapshot(page)).turnAwards.base).toEqual(['p2']);
  await page.getByRole('button', { name: 'この問いをパス', exact: true }).click();
  await expect(page.locator('.us-question')).not.toHaveAttribute('data-question-id', oldId);
  await expect(page.locator('.us-progress')).toContainText('1 / 2');
  await expect(page.locator('.us-condition')).toHaveCount(0);
  expect((await snapshot(page)).turnAwards).toEqual({ base: [], changed: [] });
  await page.getByRole('button', { name: 'ここで終える', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'ここで終える', exact: true }).last().click();
  await expect(page.getByRole('heading', { name: 'ここまでの結果' })).toBeVisible();
  expect(await page.locator('.us-rank-score').allTextContents()).toEqual(['0点', '0点']);
  await expect(page.locator('.us-rank')).toHaveCount(0);
});

test('answer correction clears draft checks and the main player is never a scorer', async ({ page }) => {
  await start(page);
  await page.locator('[data-choice="1"]').click();
  await expect(page.locator('[data-player-id="p1"]')).toHaveCount(0);
  await page.locator('[data-player-id="p2"]').click();
  await page.getByRole('button', { name: '答えを選び直す', exact: true }).click();
  await page.locator('[data-choice="3"]').click();
  await expect(page.locator('.us-revealed .us-choice-number')).toHaveText('3');
  await expect(page.locator('[data-player-id="p2"]')).toHaveAttribute('aria-pressed', 'false');
  await page.locator('[data-action="advance"]').click();
  expect((await snapshot(page)).turnAwards.base).toEqual([]);
});

test('damaged stored progress recovers to setup', async ({ page }) => {
  await page.addInitScript(key => sessionStorage.setItem(key, '{invalid'), STORAGE);
  await page.goto('/us/');
  await expect(page.getByRole('button', { name: 'はじめる', exact: true })).toBeVisible();
  await expect(page.locator('.us-notice')).toContainText('前のゲームを読み込めませんでした。');
});

test('an old link preselects its deck without silently discarding a game of the other kind', async ({ page }) => {
  await start(page, 2, 'family');
  const previous = await snapshot(page);
  await page.goto('/friends/');
  await page.locator('a[href="../us/?deck=friends"]').click();
  await expect(page.locator('[data-deck="friends"]')).toHaveAttribute('aria-pressed', 'true');
  expect((await snapshot(page)).questionId).toBe(previous.questionId);
  await page.getByRole('button', { name: '前のゲームへ戻る', exact: true }).click();
  await expect(page.locator('.us-question')).toHaveAttribute('data-question-id', previous.questionId);
  await page.reload();
  await expect(page.locator('.us-question')).toHaveAttribute('data-question-id', previous.questionId);
});

test('blocked session storage still allows in-memory play', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'sessionStorage', { get() { throw new Error('Storage blocked'); } }));
  await start(page);
  await expect(page.getByText('このブラウザでは、再読み込みするとゲームが終了します。')).toBeVisible();
  await phase(page, false);
  await expect(page.locator('.us-condition')).toBeVisible();
});

test('production hostname does not expose the pending game', async ({ page, baseURL }) => {
  await page.route('https://omoi-for.viuk-light.org/**', async route => {
    const url = new URL(route.request().url());
    const response = await route.fetch({ url: new URL(url.pathname + url.search, baseURL).href });
    await route.fulfill({ response });
  });
  await page.goto('https://omoi-for.viuk-light.org/us/');
  await expect(page.getByRole('heading', { name: '公開準備中です。', exact: true })).toBeVisible();
  await expect(page.locator('[data-action="start"]')).toHaveCount(0);
});

for (const width of [320, 390, 768, 1280]) {
  test(`setup, question, condition and scoring fit a ${width}px-wide screen`, async ({ page }) => {
    await page.setViewportSize({ width, height: width >= 768 ? 900 : 844 });
    await start(page, 4);
    const entryWidths = await page.evaluate(async () => {
      const widths = [];
      const until = performance.now() + 450;
      do {
        widths.push(document.documentElement.scrollWidth);
        await new Promise(requestAnimationFrame);
      } while (performance.now() < until);
      return widths;
    });
    expect(Math.max(...entryWidths)).toBeLessThanOrEqual(width);
    const noOverflow = async () => expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await noOverflow();
    await phase(page);
    await noOverflow();
    await page.locator('[data-choice="1"]').click();
    await noOverflow();
    await page.locator('.us-condition-reference summary').click();
    await expect(page.locator('.us-condition-reference p').first()).toBeVisible();
    await noOverflow();
  });
}

test('names render as text and stay readable with long labels', async ({ page }) => {
  await page.goto('/us/');
  await page.locator('[data-name-index="0"]').fill('<img src=x>');
  await page.locator('[data-name-index="1"]').fill('あいうえおかきくけこさしすせそた');
  await page.getByRole('button', { name: 'はじめる', exact: true }).click();
  await expect(page.locator('.us-progress')).toContainText('<img src=x>');
  await expect(page.locator('#us-main img')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('keyboard play preserves focus and reduced motion removes the condition animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/us/');
  const deck = page.locator('[data-deck="friends"]');
  await deck.focus();
  await page.keyboard.press('Enter');
  await expect(deck).toBeFocused();
  await expect(deck).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-action="start"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.us-question h1')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('[data-choice="1"]')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.us-score-title')).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(page.locator('[data-player-id="p2"]')).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page.locator('[data-player-id="p2"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-action="advance"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.us-condition')).toBeVisible();
  expect(await page.locator('.us-condition').evaluate(element => getComputedStyle(element).animationName)).toBe('none');
  await page.locator('[data-action="finish"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.locator('[data-action="finish"]')).toBeFocused();
});

test('Couples, Adults warning and Self-Care continue their existing card flows', async ({ page }) => {
  for (const series of ['couples', 'adults', 'self-care']) {
    await page.goto(`/${series}/`);
    await expect(page.locator('[data-action="start"]')).toBeEnabled();
    if (series === 'adults') await page.locator('[data-intensity="deep"]').click();
    await page.locator('[data-action="start"]').click();
    if (series === 'adults') {
      await expect(page.locator('#deep-warning-title')).toBeVisible();
      await expect(page.locator('#question-card')).toHaveCount(0);
      await page.locator('[data-action="confirm-deep"]').click();
    }
    await expect(page.locator('#question-card')).toBeVisible();
    await page.locator('[data-action="reveal"]').click();
    await expect(page.locator('.question-card-back')).toHaveAttribute('aria-hidden', 'false');
    await page.locator('[data-action="finish"]').click();
    await expect(page.getByRole('heading', { name: 'おつかれさま' })).toBeVisible();
  }
});
