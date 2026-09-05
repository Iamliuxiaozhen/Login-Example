(function () {
  const locale = document.documentElement.dataset.locale;
  const page = document.documentElement.dataset.page || '/index.html';
  const sourceUrl = new URL(page, location.origin);

  function copyElement(element) {
    return document.importNode(element, true);
  }

  function runScript(source) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      if (source.src) {
        script.src = new URL(source.getAttribute('src'), sourceUrl).href;
        script.onload = resolve;
        script.onerror = reject;
      } else {
        script.textContent = source.textContent;
        resolve();
      }
      document.body.appendChild(script);
    });
  }

  fetch(sourceUrl.href).then((response) => {
    if (!response.ok) throw new Error('page_load_failed');
    return response.text();
  }).then(async (html) => {
    const source = new DOMParser().parseFromString(html, 'text/html');
    document.documentElement.lang = locale === 'zh-cn' ? 'zh-CN' : locale === 'zh-hant' ? 'zh-Hant' : 'en-US';
    document.head.replaceChildren(...[...source.head.children].filter((element) => element.tagName !== 'SCRIPT').map(copyElement));
    document.body.replaceChildren(...[...source.body.children].filter((element) => element.tagName !== 'SCRIPT').map(copyElement));
    window.__LOCALE__ = locale;
    const scripts = [...source.head.querySelectorAll('script'), ...source.body.querySelectorAll('script')];
    for (const script of scripts) await runScript(script);
  }).catch((error) => {
    console.error(error);
    document.body.textContent = 'Unable to load this page.';
  });
})();
