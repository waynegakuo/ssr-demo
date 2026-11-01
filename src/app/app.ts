import { Component, signal } from '@angular/core';
import { UserAuth } from './shared/components/user-auth/user-auth';

@Component({
  imports: [UserAuth],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('ssr-demo');
}
