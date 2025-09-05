import { Component, inject, OnInit } from '@angular/core';

import { CollectionViewer, DataSource } from '@angular/cdk/collections';
import { AsyncPipe, CommonModule } from '@angular/common';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { Router } from '@angular/router';
import { AuthUser, fetchUserAttributes, UserAttributeKey } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/data';
import { BehaviorSubject, Observable } from 'rxjs';
import type { Schema } from '../../../amplify/data/resource';
import { UserService } from '../user.service';
import { GamesService } from './games.service';
import { PreloadData } from './preload.decorator';

const client = generateClient<Schema>();

type Game = Schema['Game']['type'];

export class GamesDataSource implements DataSource<Game> {
  private readonly gamesSubject = new BehaviorSubject<Game[]>([]);
  private readonly loadingSubject = new BehaviorSubject<boolean>(false);

  constructor(private readonly gamesService: GamesService) {}

  connect(_collectionViewer: CollectionViewer): Observable<Game[]> {
    return this.gamesSubject.asObservable();
  }

  disconnect(_collectionViewer: CollectionViewer): void {
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

      // Filter out empty games
      const games = result.data || [];
      const gamesWithPlayers = [];

      for (const game of games) {
        const usersResult = await client.models.User.list({
          filter: { gameId: { eq: game.id } },
        });
        if (usersResult.data && usersResult.data.length > 0) {
          gamesWithPlayers.push(game);
        }
      }

      this.gamesSubject.next(gamesWithPlayers);
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
  standalone: true,
  imports: [CommonModule, MatTableModule, MatPaginatorModule, MatProgressSpinnerModule, AsyncPipe],
  templateUrl: `lobby.component.html`,
  styleUrl: './lobby.component.css',
})
@PreloadData(async function (this: LobbyComponent) {
  this.user = await this.userService.fetchData();
  this.userAttributes = await fetchUserAttributes();
})
export class LobbyComponent implements OnInit {
  user: AuthUser | null = null;
  userAttributes: Partial<Record<UserAttributeKey, string>> | null = null;

  dataSource: GamesDataSource;
  displayedColumns = ['name', 'owner', 'createdAt', 'state'];

  private readonly userService = inject(UserService);
  private readonly gamesService = inject(GamesService);
  private readonly router = inject(Router);

  constructor() {
    this.dataSource = new GamesDataSource(this.gamesService);
  }

  ngOnInit() {
    this.dataSource.loadGames();
  }

  async getUserProfile() {
    try {
      const { data, errors } = await client.models['User']['list']({
        filter: {
          profileOwner: {
            beginsWith: this.user?.userId,
          },
        },
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
        console.error('Käyttäjäprofiilia ei löytynyt');
        return;
      }
      // Fetch the game to ensure it is joinable
      // fetch single game by filtering the list for the id (Data client doesn't expose a typed .get() in all codegen variants)
      const gameResult = await client.models['Game']['list']({ filter: { id: { eq: id } } });
      const game =
        Array.isArray(gameResult.data) && gameResult.data.length > 0
          ? gameResult.data[0]
          : undefined;
      if (!game) {
        console.error('Peliä ei löytynyt');
        return;
      }
      if (game.state !== 'joinable') {
        // allow rejoin if user was already in this game (e.g. reconnect)
        if (game.state === 'ongoing' && user.gameId === id) {
          // allow rejoin
        } else {
          console.warn('Ei voi liittyä: peli ei ole liittyvässä tilassa');
          return;
        }
      }

      await client.models['User']['update'](
        {
          id: user.id,
          gameId: id,
        },
        {
          authMode: 'userPool',
        }
      );
      this.router.navigate(['/game', id]);
    } catch (error) {
      console.error('error joining game', error);
    }
  }

  async createGame() {
    if (!this.user) {
      console.error('Käyttäjä ei ole kirjautunut');
      return;
    }
    try {
      const name = window.prompt('Pelin nimi') ?? 'Nimeämätön peli';
      const host = this.getHostName();

      const game = await client.models['Game']['create'](
        { name, hostedBy: host, state: 'joinable' },
        { authMode: 'userPool' }
      );

      if (game?.data && typeof game.data === 'object' && game.data !== null && 'id' in game.data) {
        const gameData = game.data as Record<string, unknown>;
        if (typeof gameData['id'] === 'string') {
          await this.joinGame(gameData['id']);
        }
      }
    } catch (error) {
      console.error('error creating games', error);
    }
  }

  private getHostName(): string {
    return this.userAttributes?.nickname ?? 'unknown';
  }

  deleteGame(id: string) {
    client.models['Game']['update'](
      {
        id,
        state: 'finished',
      },
      {
        authMode: 'userPool',
      }
    );
  }

  onRowClicked(game: Game) {
    this.router.navigate(['/game', game.id]);
    console.warn('Riviä klikattu:', game);
  }

  viewProfile() {
    this.router.navigate(['/profile']);
  }
}
