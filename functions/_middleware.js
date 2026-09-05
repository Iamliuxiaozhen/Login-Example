export function onRequest(context) {
  const host = context.request.headers.get("host");
  const url = new URL(context.request.url);

  if (host === "login---example.pages.dev") {
    return Response.redirect(
      `https://login-example.liuxiaozhen.dev${url.pathname}${url.search}`,
      301
    );
  }

  if (url.pathname === "/") {
    const language = (requestLanguage(context.request) || "en-us");
    return Response.redirect(new URL(`/${language}/`, url), 302);
  }

  const legacy = {
    "/me/github": "me/github",
    "/me/google": "me/google",
    "/me/microsoft": "me/microsoft",
    "/agreement/terms-service": "agreement/terms-service",
    "/agreement/PrivacyPolicy": "agreement/PrivacyPolicy",
  };
  const legacyPath = url.pathname.replace(/\/$/, "");
  if (legacy[legacyPath]) {
    const language = requestLanguage(context.request);
    return Response.redirect(new URL(`/${language}/${legacy[legacyPath]}/`, url), 302);
  }

  return context.next();
}

function requestLanguage(request) {
  const value = (request.headers.get("Accept-Language") || "").toLowerCase();
  const languages = value.split(",").map((entry, index) => {
    const [tag, ...params] = entry.trim().split(";");
    const quality = Number(params.find(param => param.trim().startsWith("q="))?.trim().slice(2) || "1");
    return { tag, quality: Number.isNaN(quality) ? 0 : quality, index };
  }).sort((left, right) => right.quality - left.quality || left.index - right.index);
  for (const { tag } of languages) {
    if (["zh-tw", "zh-hk", "zh-hant"].some(value => tag === value || tag.startsWith(`${value}-`))) return "zh-hant";
    if (tag === "zh" || tag.startsWith("zh-")) return "zh-cn";
    if (tag === "en" || tag.startsWith("en-")) return "en-us";
  }
  return "en-us";
}
