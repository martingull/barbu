import { expect, test } from '@playwright/test';

test('page fits, local assets load, and navigation and FAQ work', async ({ page, browserName }) => {
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
  expect(errors).toEqual([]);
});

test('video waits for a play action and retains its portrait size', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', request => { if (request.url().includes('youtube')) requests.push(request.url()); });
  // Test our embed handoff without making external playback or consent a test dependency.
  await page.route('https://www.youtube-nocookie.com/**', route => route.fulfill({ contentType: 'text/html', body: '<p>Video player</p>' }));
  await page.goto('/');
  const poster = page.getByRole('button', { name: 'Play the 30-second Barbu preview' });
  await poster.scrollIntoViewIfNeeded();
  await expect(poster).toBeVisible();
  expect(requests).toEqual([]);
  const before = await page.locator('.video-frame').boundingBox();
  expect(before!.width / before!.height).toBeCloseTo(9 / 16, 2);
  await poster.focus();
  await poster.press('Enter');
  const iframe = page.locator('iframe');
  await expect(iframe).toHaveAttribute('src', 'https://www.youtube-nocookie.com/embed/FeuhyBNAAv0?autoplay=1&playsinline=1');
  await expect(iframe).toBeFocused();
  const after = await page.locator('.video-frame').boundingBox();
  expect(after!.width).toBeCloseTo(before!.width, 1);
  expect(after!.height).toBeCloseTo(before!.height, 1);
  await expect(page.getByRole('link', { name: 'Watch on YouTube', exact: true })).toBeVisible();
});

test('preview and download remain available without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(baseURL!);
  await expect(page.getByRole('link', { name: 'Get Barbu on Google Play' })).toBeVisible();
  await expect(page.locator('noscript img')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Watch on YouTube', exact: true })).toHaveAttribute('href', 'https://www.youtube.com/watch?v=FeuhyBNAAv0');
  await context.close();
});
