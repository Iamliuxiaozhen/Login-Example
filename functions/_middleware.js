export function onRequest(context) {
  const host = context.request.headers.get("host");
  const url = new URL(context.request.url);

  if (host === "login---example.pages.dev") {
    return Response.redirect(
      `https://login-example.liuxiaozhen.dev${url.pathname}${url.search}`,
      301
    );
  }

  return context.next();
}