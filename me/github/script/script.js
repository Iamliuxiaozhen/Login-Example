const copy = window.AppI18n.t;
const localeHome = `/${window.AppI18n.locale}/`;
const fields = {
  username: document.getElementById('username'), login: document.getElementById('login'), bio: document.getElementById('bio'),
  avatar: document.getElementById('avatar'), repositories: document.getElementById('Repositories'),
  followers: document.getElementById('Followers'), following: document.getElementById('Following')
};

async function accountAction(url) {
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok || data.status !== 'ok') throw new Error('account_action_failed');
    location.href = localeHome;
  } catch (error) {
    console.error(error);
    alert(copy.logoutError);
  }
}

document.getElementById('logout_btn').addEventListener('click', () => accountAction('/api/github/exit'));
document.getElementById('Log_out_bin').addEventListener('click', () => accountAction('/api/github/log_out'));

fetch('/api/github/me').then(response => response.json()).then(data => {
  if (!data.authenticated) return location.href = localeHome;
  fields.username.textContent = data.user.name || data.user.login;
  fields.login.textContent = data.user.login || '';
  fields.bio.textContent = data.user.bio || '';
  fields.avatar.src = data.user.avatar_url || '';
  fields.repositories.textContent = data.user.public_repos ?? '0';
  fields.followers.textContent = data.user.Followers ?? '0';
  fields.following.textContent = data.user.Following ?? '0';
}).catch(error => { console.error(error); alert(copy.loadError); });
