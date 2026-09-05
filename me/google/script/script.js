const copy = window.AppI18n.t;
const localeHome = `/${window.AppI18n.locale}/`;

document.getElementById('logout_btn').addEventListener('click', async () => {
  try {
    const response = await fetch('/api/google/exit');
    const data = await response.json();
    if (!response.ok || data.status !== 'ok') throw new Error('logout_failed');
    location.href = localeHome;
  } catch (error) {
    console.error(error);
    alert(copy.logoutError);
  }
});

fetch('/api/google/me').then(response => response.json()).then(data => {
  if (!data.authenticated) return location.href = localeHome;
  document.getElementById('avatar').src = data.user.picture || '';
  document.getElementById('username').textContent = data.user.name || '';
  document.getElementById('email').textContent = data.user.email || '';
}).catch(error => { console.error(error); alert(copy.loadError); });
