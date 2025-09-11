import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { Amplify } from 'aws-amplify';
import outputs from '../../amplify_outputs.json';
import { AmplifyAuthenticatorModule, AuthenticatorService } from '@aws-amplify/ui-angular';
import { signOut } from 'aws-amplify/auth';
import { GraphqlClientService } from './shared/graphql-client.service';

Amplify.configure(outputs);

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  imports: [RouterOutlet, AmplifyAuthenticatorModule],
})
export class AppComponent implements OnInit {
  title = 'maksi-jatsi';
  public authenticator = inject(AuthenticatorService);
  private router = inject(Router);
  private graphqlClient = inject(GraphqlClientService);
  public isGuest = false;

  constructor() {
    Amplify.configure(outputs);
  }

  isInGame(): boolean {
    return this.router.url.includes('/game/');
  }

  async continueAsGuest(): Promise<void> {
    this.isGuest = true;
    const guestId = this.generateGuestId();
    // Store guest status in localStorage for persistence
    localStorage.setItem('isGuest', 'true');
    localStorage.setItem('guestId', guestId);
    // Switch GraphQL client to guest mode
    this.graphqlClient.switchToGuestMode();

    // Create guest user record
    try {
      await this.graphqlClient.client.models.User.create({
        name: `Vieras_${guestId.slice(-4)}`,
        isGuest: true,
        guestId,
      });
    } catch (error) {
      console.error('Error creating guest user:', error);
    }
  }

  async signOut(): Promise<void> {
    if (this.isGuest) {
      this.isGuest = false;
      localStorage.removeItem('isGuest');
      localStorage.removeItem('guestId');
      this.graphqlClient.switchToUserMode();
      this.router.navigate(['/']);
    } else {
      await signOut();
    }
  }

  private generateGuestId(): string {
    return `guest_${Math.random().toString(36).substr(2, 9)}`;
  }

  ngOnInit(): void {
    // Check if user was previously a guest
    this.isGuest = localStorage.getItem('isGuest') === 'true';
    if (this.isGuest) {
      this.graphqlClient.switchToGuestMode();
    }
  }
}
