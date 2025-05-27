import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';

const client = generateClient<Schema>();

@Component({
  selector: 'app-lobby',
  imports: [CommonModule],
  templateUrl: `lobby.component.html`,
  styleUrl: './lobby.component.css',
})
export class LobbyComponent {
  games: any[] = [];

  public createSub = client.models.Game.onCreate().subscribe({
    next: (data) => this.games = [...this.games, data],
    error: (error) => console.warn(error),
  });

  public updateSub = client.models.Game.onUpdate().subscribe({
    next: (data) => this.games = [...this.games, data],
    error: (error) => console.warn(error),
  });

  public deleteSub = client.models.Game.onDelete().subscribe({
    next: (data) => this.games = [...this.games, data],
    error: (error) => console.warn(error),
  });

  constructor() {
  }

  ngOnInit(): void {
    this.listGames();
  }

  ngOnDestroy(): void {
    this.createSub.unsubscribe();
    this.updateSub.unsubscribe();
    this.deleteSub.unsubscribe();
  }

  listGames() {
    try {
      client.models.Game.observeQuery().subscribe({
        next: ({ items, isSynced }) => {
          console.log('Games fetched:', items, 'Is synced:', isSynced);
          this.games = items;
        },
      });
    } catch (error) {
      console.error('error fetching games', error);
    }
  }

  createGame() {
    try {
      client.models.Game.create({
        name: window.prompt('Game name')!,
      },
      {
        authMode: 'userPool'
      });
      this.listGames();
    } catch (error) {
      console.error('error creating games', error);
    }
  }

  deleteGame(id: string) {
    client.models.Game.delete({ id })
  }

}
