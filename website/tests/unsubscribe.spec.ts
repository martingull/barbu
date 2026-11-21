import { expect, test } from '@playwright/test';

const token = 'a'.repeat(43);
const apiUrl = 'https://example.lambda-url.us-east-1.on.aws/';

test('private links do nothing on load and require explicit confirmation', async ({ page }, info) => {
  const posts: string[] = [];
  const privateRequests: string[] = [];
  page.on('request', request => { if (request.url().includes(token)) privateRequests.push(request.url()); });
  await page.route('**/unsubscribe-config.json', route => route.fulfill({ json: { apiUrl } }));
  await page.route(`${apiUrl}unsubscribe`, route => {
    posts.push(route.request().postData()!);
    return route.fulfill({ json: { unsubscribed: true }, headers: { 'access-control-allow-origin': 'http://127.0.0.1:4178' } });
  });
  await page.goto(`/unsubscribe.html#token=${token}`);
  const button = page.getByRole('button', { name: 'Stop Barbu outreach', exact: true });
  await expect(button).toBeEnabled();
  expect(posts).toEqual([]);
  expect(privateRequests).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.screenshot({ path: info.outputPath('unsubscribe-confirmation.png'), fullPage: true });
  await button.click();
  await expect(page.getByRole('status')).toContainText('You are unsubscribed.');
  expect(posts).toEqual([JSON.stringify({ token })]);
  await expect(button).toBeHidden();
  await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', 'noindex, nofollow');
  await expect(page.locator('meta[name=referrer]')).toHaveAttribute('content', 'no-referrer');
});

test('missing references cannot unsubscribe and expose an email fallback', async ({ page }) => {
  await page.goto('/unsubscribe.html');
  await expect(page.getByRole('button', { name: 'Stop Barbu outreach' })).toBeDisabled();
  await expect(page.getByRole('status')).toContainText('missing its private reference');
  await expect(page.getByRole('link', { name: 'martin@insilicoveritas.org', exact: true })).toHaveAttribute('href', 'mailto:martin@insilicoveritas.org?subject=Stop%20Barbu%20outreach');
});

test('service failure never falsely confirms an opt-out and permits retry', async ({ page }) => {
  await page.route('**/unsubscribe-config.json', route => route.fulfill({ json: { apiUrl } }));
  await page.route(`${apiUrl}unsubscribe`, route => route.fulfill({ status: 503, json: { error: 'Unavailable' }, headers: { 'access-control-allow-origin': 'http://127.0.0.1:4178' } }));
  await page.goto(`/unsubscribe.html#token=${token}`);
  await page.getByRole('button', { name: 'Stop Barbu outreach' }).click();
  await expect(page.getByRole('status')).toContainText('Your unsubscribe status is not confirmed.');
  await expect(page.getByRole('button', { name: 'Stop Barbu outreach' })).toBeEnabled();
});

test('email fallback remains available without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${baseURL}/unsubscribe.html#token=${token}`);
  await expect(page.getByRole('button', { name: 'Stop Barbu outreach' })).toBeDisabled();
  await expect(page.getByRole('link', { name: 'martin@insilicoveritas.org', exact: true })).toBeVisible();
  await context.close();
});
