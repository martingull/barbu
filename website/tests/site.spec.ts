import { expect, test } from '@playwright/test';

test('page fits, local assets load, and navigation and FAQ work', async ({ page, browserName }, info) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.url().startsWith('http://127.0.0.1:4178') && !response.ok()) errors.push(response.url());
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Barbu');
  await expect(page.getByRole('link', { name: 'Get Barbu on Google Play' })).toHaveAttribute('href', 'https://play.google.com/store/apps/details?id=com.martin.barbu');
  // macOS WebKit uses Option-Tab to include links in keyboard navigation.
  await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#main$/);
  for (const [name, id] of [['The games', 'games'], ['For clubs', 'organisers'], ['Watch Barbu', 'preview']]) {
    await page.getByRole('navigation', { name: 'Main', exact: true }).getByRole('link', { name, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`#${id}$`));
    await expect(page.locator(`#${id}`)).toBeInViewport();
  }
  const question = page.getByText('Can I play with friends online?', { exact: true });
  await question.click();
  await expect(page.getByText('No. Practice and Play use computer opponents.', { exact: false })).toBeVisible();
  await question.press('Enter');
  await expect(page.locator('details[open]')).toHaveCount(0);
  await page.locator('#preview').scrollIntoViewIfNeeded();
  await expect.poll(() => page.locator('img').evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0))).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.evaluate(() => scrollTo(0, 0));
  const hero = await page.locator('.hero').boundingBox();
  expect(hero!.y + hero!.height).toBeLessThan(page.viewportSize()!.height - 20);
  await page.screenshot({ path: info.outputPath('homepage.png'), fullPage: true });
  expect(errors).toEqual([]);
});

for (const path of ['/', '/gin-rummy.html']) test(`video on ${path} waits for a play action and retains its portrait size`, async ({ page }) => {
  const requests: string[] = [];
  page.on('request', request => { if (request.url().includes('youtube')) requests.push(request.url()); });
  // Test our embed handoff without making external playback or consent a test dependency.
  await page.route('https://www.youtube-nocookie.com/**', route => route.fulfill({ contentType: 'text/html', body: '<p>Video player</p>' }));
  await page.goto(path);
  const poster = page.getByRole('button', { name: 'Play the Gin Rummy knock or gin video' });
  await poster.scrollIntoViewIfNeeded();
  await expect(poster).toBeVisible();
  expect(requests).toEqual([]);
  const before = await page.locator('.video-frame').boundingBox();
  expect(before!.width / before!.height).toBeCloseTo(9 / 16, 2);
  await poster.focus();
  await poster.press('Enter');
  const iframe = page.locator('iframe');
  await expect(iframe).toHaveAttribute('src', 'https://www.youtube-nocookie.com/embed/YSz8LAFvlD0?autoplay=1&playsinline=1');
  await expect(iframe).toHaveAttribute('title', 'Gin Rummy: can you knock or go gin?');
  await expect(iframe).toBeFocused();
  const after = await page.locator('.video-frame').boundingBox();
  expect(after!.width).toBeCloseTo(before!.width, 1);
  expect(after!.height).toBeCloseTo(before!.height, 1);
  await expect(page.getByRole('link', { name: 'Watch on YouTube', exact: true })).toBeVisible();
});

for (const path of ['/', '/gin-rummy.html']) test(`preview and download on ${path} remain available without JavaScript`, async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(new URL(path, baseURL!).href);
  await expect(page.getByRole('link', { name: 'Get Barbu on Google Play' })).toBeVisible();
  await expect(page.locator('noscript img')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Watch on YouTube', exact: true })).toHaveAttribute('href', 'https://www.youtube.com/watch?v=YSz8LAFvlD0');
  await context.close();
});

test('Gin guide is linked, readable and explains the real lesson hand', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.url().startsWith('http://127.0.0.1:4178') && !response.ok()) errors.push(response.url());
  });
  await page.goto('/');
  await page.getByRole('link', { name: 'Learn when to knock in Gin Rummy', exact: true }).click();
  await expect(page).toHaveURL(/\/gin-rummy.html$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Learn Gin Rummy');
  await expect(page.getByLabel('Ten-card example hand')).toContainText('3♣ 4♣ 5♣');
  await expect(page.getByLabel('Ten-card example hand')).toContainText('7♦ 7♥ 7♠');
  await expect(page.getByLabel('Ten-card example hand')).toContainText('9♥ 10♥ J♥');
  await page.getByText('Reveal the answer', { exact: true }).click();
  await expect(page.locator('.worked-answer')).toContainText('You may knock, but you cannot go gin.');
  await expect(page.locator('.worked-answer')).toContainText('two points');
  await page.locator('#video').scrollIntoViewIfNeeded();
  await expect.poll(() => page.locator('img').evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0))).toBe(true);
  for (const selector of ['.guide-heading', '.card-values', '.example-hand', '.worked-answer', '.video-frame', '#practise']) {
    const box = (await page.locator(selector).boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.screenshot({ path: info.outputPath('gin-rummy-guide.png'), fullPage: true });
  await expect(page.getByRole('link', { name: 'Get Barbu on Google Play' })).toHaveAttribute('href', 'https://play.google.com/store/apps/details?id=com.martin.barbu');
  expect(errors).toEqual([]);
});

test('search metadata and sitemap identify distinct crawlable pages', async ({ page, request }) => {
  const canonicals = new Set<string>();
  const titles = new Set<string>();
  for (const path of ['/', '/gin-rummy.html']) {
    const response = await page.goto(path);
    expect(response!.status()).toBe(200);
    const canonical = await page.locator('link[rel=canonical]').getAttribute('href');
    expect(canonical).toBe(`https://siliciumveritas.com${path}`);
    canonicals.add(canonical!);
    titles.add(await page.title());
    expect(await page.locator('meta[name=description]').getAttribute('content')).toBeTruthy();
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', canonical!);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    expect(await page.locator('meta[name=robots]').count()).toBe(0);
  }
  expect(canonicals.size).toBe(2);
  expect(titles.size).toBe(2);
  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.ok()).toBe(true);
  const locations = await page.evaluate(xml => Array.from(new DOMParser().parseFromString(xml, 'application/xml').getElementsByTagName('loc'), loc => loc.textContent), await sitemap.text());
  expect(new Set(locations)).toEqual(canonicals);
  const robots = await request.get('/robots.txt');
  expect(await robots.text()).toContain('Sitemap: https://siliciumveritas.com/sitemap.xml');
});
