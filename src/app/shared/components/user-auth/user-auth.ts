import { Component, computed, inject, signal } from '@angular/core';
import { AuthService } from '../../services/auth/auth.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  imports: [],
  selector: 'app-user-auth',
  styleUrl: './user-auth.scss',
  templateUrl: './user-auth.html',
})
export class UserAuth {
  authService = inject(AuthService);

  // Local pending state for the Google popup sign-in
  readonly signingIn = signal<boolean>(false);

  // Expose auth service signals to the template
  readonly loading = computed(() => this.authService.isLoading());
  readonly isAuthed = computed(() => this.authService.isAuthenticated());

  // Reactive signals for user data
  readonly user = computed(() => this.authService.currentUser());
  readonly displayName = computed(() => this.authService.getUserDisplayName() ?? '');
  readonly photoUrl = computed(() => this.authService.getUserPhotoUrl());
  readonly initials = computed(() => this.computeInitials(this.displayName()));

  // Subject for managing subscriptions
  private destroy$ = new Subject<void>();

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

  private computeInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '';
    const first = parts[0]?.[0] ?? '';
    const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (first + last).toUpperCase();
  }
}
