import { EnvironmentInjector, inject, runInInjectionContext, Service, signal } from '@angular/core';
import {
  Auth,
  GoogleAuthProvider,
  onIdTokenChanged,
  signInWithPopup,
  signOut,
  User,
} from '@angular/fire/auth';
import { from, Observable, of, switchMap } from 'rxjs';
import { SsrSessionService } from '../ssr-session/ssr-session.service';
import {
  decodeUserFromIdToken,
  SerializableUser,
  toSerializableUser,
} from '../../utils/auth-user.util';

@Service()
export class AuthService {
  private auth = inject(Auth);
  private environmentInjector = inject(EnvironmentInjector);
  private ssrSession = inject(SsrSessionService);

  // Signals for authentication state
  currentUser = signal<SerializableUser | null>(null);
  isAuthenticated = signal<boolean>(false);
  isLoading = signal<boolean>(false);

  constructor() {
    this.initAuthState();
  }

  /**
   * Runs on the server via `provideAppInitializer`.
   * When Improved Mode is enabled, resolves the user from `FirebaseServerApp`
   * and hands the snapshot to `SsrSessionService` (`TransferState`).
   */
  async resolveServerAuth(): Promise<void> {
    if (!this.ssrSession.isServer || !this.ssrSession.ssrFixEnabled()) {
      return;
    }

    const idToken = this.ssrSession.getServerSessionToken();
    if (!idToken) {
      this.ssrSession.saveUserToTransferState(null);
      return;
    }

    await this.auth.authStateReady();

    const serverUser = this.auth.currentUser
      ? toSerializableUser(this.auth.currentUser)
      : decodeUserFromIdToken(idToken);

    this.applyUser(serverUser);
    this.ssrSession.saveUserToTransferState(serverUser);
  }

  /**
   * Runs in the browser:
   * 1. Hydrates synchronously from `TransferState` if available (Improved Mode).
   * 2. Subscribes to `onIdTokenChanged` to keep the `__session` cookie and user state in sync.
   */
  initAuthState(): void {
    if (!this.ssrSession.isBrowser) {
      return;
    }

    // 1. Seed initial state from TransferState if the server already resolved the user
    const { hasTransferredState, user: transferredUser } =
      this.ssrSession.consumeUserFromTransferState();

    if (hasTransferredState) {
      this.applyUser(transferredUser);
    }

    const hydratedFromServer = hasTransferredState && !!transferredUser;
    let isFirstEmission = true;

    // 2. Listen for client-side auth & token changes
    runInInjectionContext(this.environmentInjector, () => {
      onIdTokenChanged(
        this.auth,
        async (user) => {
          const isInitialLoad = isFirstEmission;
          isFirstEmission = false;

          await this.ssrSession.syncSessionCookie(user);
          const serialized = user ? toSerializableUser(user) : null;

          // In Default Mode, client-side Firebase resolves asynchronously from IndexedDB
          // after the server has already rendered the unauthenticated Guest view.
          if (isInitialLoad && !this.ssrSession.ssrFixEnabled() && serialized && !hydratedFromServer) {
            setTimeout(() => {
              this.applyUser(serialized);
              this.ssrSession.recordClientAuthResolution(true, false);
            }, 600);
            return;
          }

          this.applyUser(serialized);
          this.ssrSession.recordClientAuthResolution(!!serialized, hydratedFromServer);
        },
        (error) => {
          console.error('Auth state change error:', error);
          this.isLoading.set(false);
        },
      );
    });
  }

  signInWithGoogle(): Observable<User> {
    const provider = new GoogleAuthProvider();

    return runInInjectionContext(this.environmentInjector, () => {
      return from(signInWithPopup(this.auth, provider)).pipe(
        switchMap((result) => of(result.user)),
      );
    });
  }

  signOut(): Observable<void> {
    return runInInjectionContext(this.environmentInjector, () => {
      return from(signOut(this.auth));
    });
  }

  getUserId(): string | null {
    return this.currentUser()?.uid ?? null;
  }

  getUserDisplayName(): string | null {
    return this.currentUser()?.displayName ?? null;
  }

  getUserPhotoUrl(): string | null {
    return this.currentUser()?.photoURL ?? null;
  }

  private applyUser(user: SerializableUser | null): void {
    this.currentUser.set(user);
    this.isAuthenticated.set(!!user);
    this.isLoading.set(false);
  }
}
