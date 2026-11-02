import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    // Render dynamically on the server per request (instead of static Prerender)
    // so the server can inspect incoming session cookies for each user.
    path: '**',
    renderMode: RenderMode.Server,
  },
];
