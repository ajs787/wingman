export const SESSION_COOKIE_NAME = 'wingman_session';
export const SESSION_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

function shouldUseCrossSiteAuthCookies() {
  return process.env.AUTH_COOKIE_CROSS_SITE === 'true';
}

function getCookieDomain() {
  const domain = process.env.AUTH_COOKIE_DOMAIN?.trim();
  return domain || undefined;
}

function getSameSitePolicy() {
  if (!isProduction()) return 'lax';

  // A WebView client loading the hosted site may have its cookies treated as
  // cross-site. In those cases, SameSite=None + Secure is required.
  return shouldUseCrossSiteAuthCookies() ? 'none' : 'lax';
}

function getBaseSessionCookieOptions() {
  const options = {
    httpOnly: true,
    secure: isProduction(),
    sameSite: getSameSitePolicy(),
    path: '/',
  };

  const domain = getCookieDomain();
  if (domain) {
    options.domain = domain;
  }

  return options;
}

export function getSessionCookieOptions() {
  return {
    ...getBaseSessionCookieOptions(),
    maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
  };
}

export function getClearedSessionCookieOptions() {
  return {
    ...getBaseSessionCookieOptions(),
    maxAge: 0,
    expires: new Date(0),
  };
}

export function setSessionCookie(response, token) {
  response.cookies.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions());
}

export function clearSessionCookie(response) {
  response.cookies.set(SESSION_COOKIE_NAME, '', getClearedSessionCookieOptions());
}