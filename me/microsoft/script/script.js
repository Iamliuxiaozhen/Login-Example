const copy = window.AppI18n.t;
const localeHome = `/${window.AppI18n.locale}/`;

document.getElementById('logout_btn').addEventListener('click', async () => {
  try {
    const response = await fetch('/api/microsoft/exit');
    const data = await response.json();
    if (!response.ok || data.status !== 'ok') throw new Error('logout_failed');
    location.href = localeHome;
  } catch (error) {
    console.error(error);
    alert(copy.logoutError);
  }
});

fetch('/api/microsoft/me').then(response => response.json()).then(data => {
  if (!data.authenticated) return location.href = localeHome;
  document.getElementById('username').textContent = data.user.displayName || '';
  document.getElementById('mail').textContent = data.user.mail || '';
}).catch(error => { console.error(error); alert(copy.loadError); });
