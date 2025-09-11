import { Injectable } from '@angular/core';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';

type GraphQLClient = ReturnType<typeof generateClient<Schema>>;

@Injectable({
  providedIn: 'root',
})
export class GraphqlClientService {
  private _client: GraphQLClient;
  private _isGuest = false;

  constructor() {
    // Initialize based on stored guest status
    this._isGuest = localStorage.getItem('isGuest') === 'true';
    this._client = this._isGuest
      ? generateClient<Schema>({ authMode: 'apiKey' })
      : generateClient<Schema>({ authMode: 'userPool' });
  }

  get client() {
    return this._client;
  }

  switchToGuestMode(): void {
    this._isGuest = true;
    this._client = generateClient<Schema>({
      authMode: 'apiKey',
    });
  }

  switchToUserMode(): void {
    this._isGuest = false;
    this._client = generateClient<Schema>({
      authMode: 'userPool',
    });
  }

  get isGuest(): boolean {
    return this._isGuest;
  }
}
