const form = document.querySelector('#unsubscribe-form');
const button = form.querySelector('button');
const status = document.querySelector('#unsubscribe-status');
const token = new URLSearchParams(location.hash.slice(1)).get('token');

if (/^[A-Za-z0-9_-]{43}$/.test(token ?? '')) {
  button.disabled = false;
  status.textContent = 'Confirm to stop further Barbu outreach.';
} else {
  status.textContent = 'This link is missing its private reference. Please use the link in your email, or contact Martin below.';
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (button.disabled) return;
  button.disabled = true;
  status.textContent = 'Saving your request...';
  try {
    const configuration = await fetch('unsubscribe-config.json', { cache: 'no-store', credentials: 'omit', redirect: 'error' });
    if (!configuration.ok) throw Error('Unavailable');
    const { apiUrl } = await configuration.json();
    const endpoint = new URL(apiUrl);
    if (endpoint.protocol !== 'https:' || !/^[a-z0-9]+\.lambda-url\.[a-z0-9-]+\.on\.aws$/.test(endpoint.hostname) || endpoint.pathname !== '/' || endpoint.search || endpoint.hash || endpoint.username || endpoint.password) throw Error('Invalid endpoint');
    const response = await fetch(new URL('/unsubscribe', endpoint), { method: 'POST', credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(15000),
      headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token }) });
    if (!response.ok || (await response.json()).unsubscribed !== true) throw Error('Not confirmed');
    form.hidden = true;
    status.textContent = 'You are unsubscribed. We will not send further Barbu outreach to this address.';
  } catch {
    status.textContent = 'We could not confirm your request. Try again, or email Martin below. Your unsubscribe status is not confirmed.';
    button.disabled = false;
  }
});
