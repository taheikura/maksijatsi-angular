import { Component, inject } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { Amplify } from 'aws-amplify';
import outputs from '../../amplify_outputs.json';
import { AmplifyAuthenticatorModule, AuthenticatorService } from '@aws-amplify/ui-angular';

Amplify.configure(outputs);

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  imports: [RouterOutlet, AmplifyAuthenticatorModule],
})
export class AppComponent {
  title = 'maksi-jatsi';
  public authenticator = inject(AuthenticatorService);
  private router = inject(Router);

  constructor() {
    Amplify.configure(outputs);
  }

  isInGame(): boolean {
    return this.router.url.includes('/game/');
  }
}
