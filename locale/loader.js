(function () {
  const locale = document.documentElement.dataset.locale;
  const page = document.documentElement.dataset.page || '/index.html';
  fetch(page).then((response) => {
    if (!response.ok) throw new Error('page_load_failed');
    return response.text();
  }).then((html) => {
    const bootstrap = `<script>window.__LOCALE__=${JSON.stringify(locale)};<\/script>`;
    const localized = html.replace('<head>', `<head>${bootstrap}`);
    document.open();
    document.write(localized);
    document.close();
  }).catch(() => {
    document.body.textContent = 'Unable to load this page.';
  });
})();
