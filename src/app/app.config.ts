import {
  ApplicationConfig,
  inject,
  Injector,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideClientHydration } from '@angular/platform-browser';
import {
  FirebaseApp,
  initializeApp,
  initializeServerApp,
  provideFirebaseApp,
} from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { routes } from './app.routes';
import { environment } from '../environments/environment';
import { AuthService } from './shared/services/auth/auth.service';
import { SsrSessionService } from './shared/services/ssr-session/ssr-session.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideClientHydration(),

    provideFirebaseApp((injector: Injector) => {
      const ssrSession = injector.get(SsrSessionService);

      // Browser: Standard client-side Firebase app (persists auth in browser IndexedDB)
      if (ssrSession.isBrowser) {
        return initializeApp(environment.firebaseConfig);
      }

      // Server (SSR): Only pass the `__session` ID token when Improved Mode is enabled
      const authIdToken = ssrSession.ssrFixEnabled()
        ? ssrSession.getServerSessionToken()
        : undefined;

      // FirebaseServerApp authenticates the request using the user's ID token —
      // no privileged service account keys (firebase-admin) required on the server!
      return initializeServerApp(
        environment.firebaseConfig,
        authIdToken ? { authIdToken } : {},
      );
    }),

    // Pass the resolved FirebaseApp instance so getAuth() works with both
    // browser FirebaseApp and server FirebaseServerApp instances.
    provideAuth((injector: Injector) => getAuth(injector.get(FirebaseApp))),

    // Ensure Angular SSR waits for server-side auth & TransferState population before sending HTML
    provideAppInitializer(() => inject(AuthService).resolveServerAuth()),
  ],
};
