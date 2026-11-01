import {
  EnvironmentInjector,
  inject,
  PLATFORM_ID,
  runInInjectionContext,
  Service,
  signal,
} from '@angular/core';
import { Auth, onAuthStateChanged, signInWithPopup, signOut, User, GoogleAuthProvider } from '@angular/fire/auth';
import { from, Observable, of, switchMap } from 'rxjs';

@Service()
export class AuthService {
  private auth = inject(Auth);

  // Signal for the current user
  currentUser = signal<User | null>(null);

  // Signal for authentication state
  isAuthenticated = signal<boolean>(false);

  // Signal for loading state
  isLoading = signal<boolean>(true);

  private environmentInjector = inject(EnvironmentInjector);
  private platformId = inject(PLATFORM_ID);

  constructor() {
    this.initAuthState();
  }

  initAuthState(): void {
    return runInInjectionContext(this.environmentInjector, () => {
      onAuthStateChanged(
        this.auth,
        (user) => {
          this.currentUser.set(user);
          this.isAuthenticated.set(!!user);
          this.isLoading.set(false);
        },
        (error) => {
          console.error('Auth state change error:', error);
          this.isLoading.set(false);
        },
      );
    });
  }

  /**
   * Signs in with Google using a popup
   * @returns Promise that resolves with the user credentials
   */
  signInWithGoogle(): Observable<User> {
    const provider = new GoogleAuthProvider();

    return runInInjectionContext(this.environmentInjector, () => {
      return from(signInWithPopup(this.auth, provider)).pipe(
        switchMap((result) => {
          return of(result.user);
        }),
      );
    });
  }

  /**
   * Signs out the current user
   * @returns Promise that resolves when sign out is complete
   */
  signOut(): Observable<void> {
    return runInInjectionContext(this.environmentInjector, () => {
      return from(signOut(this.auth));
    });
  }

  /**
   * Gets the current user's ID
   * @returns The current user's ID or null if not authenticated
   */
  getUserId(): string | null {
    return this.currentUser() ? this.currentUser()!.uid : null;
  }

  /**
   * Gets the current user's display name
   * @returns The current user's display name or null if not authenticated
   */
  getUserDisplayName(): string | null {
    return this.currentUser() ? this.currentUser()!.displayName : null;
  }

  /**
   * Gets the current user's profile photo URL
   * @returns The current user's profile photo URL or null if not authenticated
   */
  getUserPhotoUrl(): string | null {
    return this.currentUser() ? this.currentUser()!.photoURL : null;
  }
}
