import { Component } from '@angular/core';

import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { AuthUser, fetchUserAttributes } from 'aws-amplify/auth';
import { PreloadData } from './preload.decorator';
import { UserService } from '../user.service';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { GamesService } from './games.service';
import { CollectionViewer, DataSource } from '@angular/cdk/collections';
import { BehaviorSubject, Observable } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { Router } from '@angular/router';

const client = generateClient<Schema>();

type Game = Schema['Game']['type'];

export class GamesDataSource implements DataSource<Game> {
  private readonly gamesSubject = new BehaviorSubject<Game[]>([]);
  private readonly loadingSubject = new BehaviorSubject<boolean>(false);

  constructor(private readonly gamesService: GamesService) {}

  connect(collectionViewer: CollectionViewer): Observable<Game[]> {
    return this.gamesSubject.asObservable();
  }

  disconnect(collectionViewer: CollectionViewer): void {
    this.gamesSubject.complete();
    this.loadingSubject.complete();
  }

  async loadGames(filter = '', limit = 10, nextToken?: string) {
    this.loadingSubject.next(true);
    this.gamesSubject.next([]); // Clear previous games

    try {
      const result = await this.gamesService.findGames(filter, limit, nextToken);
      if (result.errors) {
        console.error('Error loading games:', result.errors);
        this.gamesSubject.next([]);
        return;
      }
      // Assuming result.data contains the games array
      this.gamesSubject.next(result.data || []);
    } catch (error) {
      console.error('Error loading games:', error);
      this.gamesSubject.next([]);
    } finally {
      this.loadingSubject.next(false);
    }
  }

  loading() {
    return this.loadingSubject.asObservable();
  }
}

@Component({
  selector: 'app-lobby',
  imports: [MatTableModule, MatPaginatorModule, MatProgressSpinnerModule, AsyncPipe],
  templateUrl: `lobby.component.html`,
  styleUrl: './lobby.component.css',
})
@PreloadData(async function (this: LobbyComponent) {
  this.user = await this.userService.fetchData();
})
export class LobbyComponent {
  user: AuthUser | null = null;

  dataSource: GamesDataSource;
  displayedColumns = ["name", "owner", "createdAt", "state"];

  constructor(private readonly userService: UserService,
    private readonly gamesService: GamesService,
    private readonly router: Router) {
    this.dataSource = new GamesDataSource(this.gamesService);
  }

  ngOnInit() {
    this.dataSource.loadGames();
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
      this.router.navigate(['/game', id]);
    } catch (error) {
      console.error('error joining game', error);
    }
  }

  async createGame() {
    if (!this.user) {
      console.error('User not authenticated');
      return;
    }
    try {
      const userAttributes = await fetchUserAttributes();
      const game = await client.models.Game.create({
        name: window.prompt('Game name')!,
        hostedBy: userAttributes.nickname ?? 'unknown',
        state: 'joinable'
      },
      {
        authMode: 'userPool'
      });
      console.log(game.data);
      if (game.data?.id) {
        this.joinGame(game.data?.id);
      }
    } catch (error) {
      console.error('error creating games', error);
    }
  }

  deleteGame(id: string) {
    client.models.Game.update({
      id,
      state: 'finished'
    }, {
      authMode: 'userPool',
    })
  }

  onRowClicked(game: any) {
    this.router.navigate(['/game', game.id]);
    console.log('Row clicked:', game);
  }

}
