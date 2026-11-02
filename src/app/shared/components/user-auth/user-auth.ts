import { Component, computed, inject, OnDestroy, signal } from '@angular/core';
import { AuthService } from '../../services/auth/auth.service';
import { SsrSessionService } from '../../services/ssr-session/ssr-session.service';
import { computeInitials } from '../../utils/auth-user.util';
import { Subject, takeUntil } from 'rxjs';

@Component({
  imports: [],
  selector: 'app-user-auth',
  styleUrl: './user-auth.scss',
  templateUrl: './user-auth.html',
})
export class UserAuth implements OnDestroy {
  authService = inject(AuthService);
  ssrSession = inject(SsrSessionService);

  // Local pending state for the Google popup sign-in
  readonly signingIn = signal<boolean>(false);

  // Expose auth service signals to the template
  readonly loading = computed(() => this.authService.isLoading());
  readonly isAuthed = computed(() => this.authService.isAuthenticated());

  // Expose SSR session & demo mode signals to the template
  readonly ssrFixEnabled = computed(() => this.ssrSession.ssrFixEnabled());
  readonly hydrationSource = computed(() => this.ssrSession.hydrationSource());

  // Reactive signals for user data
  readonly user = computed(() => this.authService.currentUser());
  readonly displayName = computed(() => this.authService.getUserDisplayName() ?? '');
  readonly photoUrl = computed(() => this.authService.getUserPhotoUrl());
  readonly initials = computed(() => computeInitials(this.displayName()));

  // Subject for managing subscriptions
  private destroy$ = new Subject<void>();

  /**
   * Handles toggling between Default (flicker) and Improved (SSR + TransferState) modes.
   */
  onToggleSsrFix(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.ssrSession.setSsrFixMode(checked);
  }

  /**
   * Triggers a full browser reload so the audience can see the SSR initial paint
   * and client hydration behavior under the selected mode.
   */
  reloadPage(): void {
    if (this.ssrSession.isBrowser) {
      window.location.reload();
    }
  }

  signIn(): void {
    if (this.signingIn()) return; // guard against double clicks
    this.signingIn.set(true);
    const sub = this.authService
      .signInWithGoogle()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {},
        error: (err) => console.error('Sign-in failed', err),
      });
    sub.add(() => this.signingIn.set(false));
  }

  signOut(): void {
    this.authService
      .signOut()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (err) => console.error('Sign-out failed', err),
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
