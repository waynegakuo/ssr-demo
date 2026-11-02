/**
 * Cookie names used across the client-server boundary:
 * - `__session`: The only cookie name Firebase App Hosting / Cloud CDN forwards to SSR backends.
 * - `ssr_fix`: Stores the live demo toggle state ('true' = Improved SSR, 'false' = Default Flicker).
 */
export const SESSION_COOKIE_NAME = '__session';
export const DEMO_MODE_COOKIE_NAME = 'ssr_fix';

/**
 * Reads a single cookie value from a raw HTTP `Cookie` header or `document.cookie`.
 */
export function getCookieValue(cookieString: string, name: string): string | undefined {
  const match = cookieString.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : undefined;
}

/**
 * Writes a cookie in the browser with a `SameSite=Lax` policy.
 */
export function setBrowserCookie(name: string, value: string, maxAgeSeconds: number): void {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
}

/**
 * Deletes a cookie in the browser by expiring it immediately.
 */
export function clearBrowserCookie(name: string): void {
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}
