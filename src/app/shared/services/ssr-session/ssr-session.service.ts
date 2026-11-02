import {
  inject,
  makeStateKey,
  PLATFORM_ID,
  REQUEST,
  Service,
  signal,
  TransferState,
} from '@angular/core';
import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { User } from '@angular/fire/auth';
import { SerializableUser } from '../../utils/auth-user.util';
import {
  clearBrowserCookie,
  DEMO_MODE_COOKIE_NAME,
  getCookieValue,
  SESSION_COOKIE_NAME,
  setBrowserCookie,
} from '../../utils/cookie.util';

/**
 * Key used by Angular's TransferState to pass the authenticated user snapshot
 * from the Node SSR server to the browser during hydration.
 */
const AUTH_USER_KEY = makeStateKey<SerializableUser | null>('ssr-auth-user');

export type HydrationSource = 'ssr-transfer-state' | 'client-flicker' | 'guest';

/**
 * Handles SSR session cookies, TransferState hydration, and the live demo toggle
 * so that `AuthService` can stay focused strictly on Firebase Authentication.
 */
@Service()
export class SsrSessionService {
  private platformId = inject(PLATFORM_ID);
  private transferState = inject(TransferState);
  private request = inject(REQUEST, { optional: true });

  // Demo toggle state:
  // false = Default scenario (Client-only auth -> flashes "Sign In" on refresh)
  // true  = Improved scenario (Session cookie + Server Auth + TransferState -> no flicker)
  readonly ssrFixEnabled = signal<boolean>(this.readInitialDemoMode());

  // Tracks how the current UI state was resolved for the demo telemetry badge
  readonly hydrationSource = signal<HydrationSource>('guest');

  readonly isServer = isPlatformServer(this.platformId);
  readonly isBrowser = isPlatformBrowser(this.platformId);

  /**
   * Updates the demo toggle between Default (flicker) and Improved (SSR + TransferState)
   * and persists it in a cookie so both the server and browser read it on reload.
   */
  setSsrFixMode(enabled: boolean): void {
    this.ssrFixEnabled.set(enabled);
    if (this.isBrowser) {
      setBrowserCookie(DEMO_MODE_COOKIE_NAME, String(enabled), 86400);
    }
  }

  /**
   * Reads the `__session` cookie from the incoming SSR HTTP request.
   */
  getServerSessionToken(): string | undefined {
    const cookieHeader = this.request?.headers.get('cookie') ?? '';
    return getCookieValue(cookieHeader, SESSION_COOKIE_NAME);
  }

  /**
   * Syncs the browser's Firebase ID token into the `__session` cookie
   * (or clears it when the user signs out).
   */
  async syncSessionCookie(user: User | null): Promise<void> {
    if (!this.isBrowser) return;

    if (user) {
      const token = await user.getIdToken();
      setBrowserCookie(SESSION_COOKIE_NAME, token, 3600);
    } else {
      clearBrowserCookie(SESSION_COOKIE_NAME);
    }
  }

  /**
   * Stores the server-resolved user profile in Angular's TransferState payload.
   */
  saveUserToTransferState(user: SerializableUser | null): void {
    this.hydrationSource.set(user ? 'ssr-transfer-state' : 'guest');
    this.transferState.set(AUTH_USER_KEY, user);
  }

  /**
   * Reads and removes the server-transferred user snapshot on the browser
   * when Improved Mode is enabled.
   */
  consumeUserFromTransferState(): { hasTransferredState: boolean; user: SerializableUser | null } {
    if (!this.isBrowser || !this.ssrFixEnabled() || !this.transferState.hasKey(AUTH_USER_KEY)) {
      return { hasTransferredState: false, user: null };
    }

    const user = this.transferState.get(AUTH_USER_KEY, null);
    this.transferState.remove(AUTH_USER_KEY);
    this.hydrationSource.set(user ? 'ssr-transfer-state' : 'guest');

    return { hasTransferredState: true, user };
  }

  /**
   * Updates the telemetry badge source after client-side auth resolves.
   */
  recordClientAuthResolution(isAuthenticated: boolean, wasHydratedFromServer: boolean): void {
    if (!isAuthenticated) {
      this.hydrationSource.set('guest');
    } else if (wasHydratedFromServer) {
      this.hydrationSource.set('ssr-transfer-state');
    } else {
      this.hydrationSource.set('client-flicker');
    }
  }

  private readInitialDemoMode(): boolean {
    if (isPlatformServer(this.platformId)) {
      const cookieHeader = this.request?.headers.get('cookie') ?? '';
      return getCookieValue(cookieHeader, DEMO_MODE_COOKIE_NAME) === 'true';
    }
    if (isPlatformBrowser(this.platformId)) {
      return getCookieValue(document.cookie, DEMO_MODE_COOKIE_NAME) === 'true';
    }
    return false;
  }
}
