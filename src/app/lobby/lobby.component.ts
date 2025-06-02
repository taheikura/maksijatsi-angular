import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { AuthUser } from 'aws-amplify/auth';
import { PreloadData } from '../preload.decorator';
import { UserService } from '../user.service';
import { MatTableModule } from '@angular/material/table';

const client = generateClient<Schema>();

@Component({
  selector: 'app-lobby',
  imports: [CommonModule, MatTableModule],
  templateUrl: `lobby.component.html`,
  styleUrl: './lobby.component.css',
})
@PreloadData(async function (this: LobbyComponent) {
  this.user = await this.userService.fetchData();
  this.listGames();
})
export class LobbyComponent {
  games: any[] = [];
  user: AuthUser | null = null;

  displayedColumns = ["name", "owner", "createdAt"];

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

  constructor(private readonly userService: UserService) {
  }

  ngOnDestroy(): void {
    this.createSub.unsubscribe();
    this.updateSub.unsubscribe();
    this.deleteSub.unsubscribe();
  }

  async getUserProfile() {
    try {
      const { data, errors } = await client.models.User.list({
        filter: {
          profileOwner: {
            beginsWith: this.user?.userId,
          }
        }
      });
      if (errors) {
        console.error('Error fetching user:', errors);
        return null;
      }

      return data[0];
    } catch (error) {
      console.error('error fetching user', error);
    }
    return null;
  }

  async joinGame(id: string) {
    try {
      const user = await this.getUserProfile();
      console.log('User profile:', user);
      if (!user) {
        console.error('User profile not found');
        return;
      }
      client.models.User.update({
        id: user.id,
        gameId: id,
      }, {
        authMode: 'userPool',
      });
    } catch (error) {
      console.error('error joining game', error);
    }
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
    } catch (error) {
      console.error('error creating games', error);
    }
  }

  deleteGame(id: string) {
    client.models.Game.delete({ id })
  }

}
