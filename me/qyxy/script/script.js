const copy = window.AppI18n.t;
const localeHome = `/${window.AppI18n.locale}/`;
const fields = {
  nickname: document.getElementById('nickname'), username: document.getElementById('username'), email: document.getElementById('email'),
  avatar: document.getElementById('avatar'), group: document.getElementById('UserGroup'),
  level: document.getElementById('Level'), userId: document.getElementById('UserId')
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

document.getElementById('logout_btn').addEventListener('click', () => accountAction('/api/qyxy/exit'));

fetch('/api/qyxy/me').then(response => response.json()).then(data => {
  if (!data.authenticated) return location.href = localeHome;
  fields.nickname.textContent = data.user.nickname || data.user.username || '';
  fields.username.textContent = data.user.username ? '@' + data.user.username : '';
  fields.email.textContent = data.user.email || '';
  if (data.user.avatar) {
    fields.avatar.src = data.user.avatar;
  } else {
    fields.avatar.style.display = 'none';
  }
  fields.group.textContent = data.user.user_group || '';
  fields.level.textContent = data.user.level ?? '';
  fields.userId.textContent = data.user.id ?? '';
}).catch(error => { console.error(error); alert(copy.loadError); });
