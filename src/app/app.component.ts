import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Amplify } from 'aws-amplify';
import { fetchUserAttributes } from 'aws-amplify/auth';
import outputs from '../../amplify_outputs.json';
import { AmplifyAuthenticatorModule, AuthenticatorService } from '@aws-amplify/ui-angular';
import { LobbyComponent } from "./lobby/lobby.component";

Amplify.configure(outputs);

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  imports: [RouterOutlet, LobbyComponent, AmplifyAuthenticatorModule],
})
export class AppComponent {
  title = 'maksi-jatsi';

  public userAttributes: any;

  constructor(public authenticator: AuthenticatorService) {
    Amplify.configure(outputs);
  }

  async ngOnInit() {
    try {
      this.userAttributes = await fetchUserAttributes();
    } catch (error) {
      console.error('Error fetching user attributes:', error);
    }
  }
}
