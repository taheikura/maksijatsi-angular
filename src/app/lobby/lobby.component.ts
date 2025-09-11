import { Component, inject, OnInit } from '@angular/core';

import { CollectionViewer, DataSource } from '@angular/cdk/collections';
import { AsyncPipe, CommonModule } from '@angular/common';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { Router } from '@angular/router';
import { AuthUser, fetchUserAttributes, UserAttributeKey } from 'aws-amplify/auth';
import { BehaviorSubject, Observable } from 'rxjs';
import type { Schema } from '../../../amplify/data/resource';
import { ChatComponent } from '../chat/chat.component';
import { GraphqlClientService } from '../shared/graphql-client.service';
import { UserService } from '../user.service';
import { GamesService } from './games.service';
import { PreloadData } from './preload.decorator';

type Game = Schema['Game']['type'];

export class GamesDataSource implements DataSource<Game> {
  private readonly gamesSubject = new BehaviorSubject<Game[]>([]);
  private readonly loadingSubject = new BehaviorSubject<boolean>(false);

  constructor(
    private readonly gamesService: GamesService,
    private readonly graphqlClient: GraphqlClientService
  ) {}

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
        console.error('Error loading games');
        this.gamesSubject.next([]);
        return;
      }

      // Filter out empty games
      const games = result.data || [];

      // Get all users in a single query to avoid N+1 problem
      const usersResult = await this.graphqlClient.client.models.User.list();
      const gameIds = new Set(usersResult.data?.map((user) => user.gameId).filter(Boolean) ?? []);

      const gamesWithPlayers = games.filter((game) => gameIds.has(game.id));
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
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    AsyncPipe,
    ChatComponent,
  ],
  templateUrl: `lobby.component.html`,
  styleUrl: './lobby.component.css',
})
@PreloadData(async function (this: LobbyComponent) {
  if (!this.graphqlClient.isGuest) {
    this.user = await this.userService.fetchData();
    this.userAttributes = await fetchUserAttributes();
  } else {
    // For guests, create a mock user object
    const guestId = localStorage.getItem('guestId') ?? 'guest';
    this.user = { userId: guestId } as AuthUser;
    this.userAttributes = { nickname: `Vieras_${guestId.slice(-4)}` };
  }
})
export class LobbyComponent implements OnInit {
  user: AuthUser | null = null;
  userAttributes: Partial<Record<UserAttributeKey, string>> | null = null;
  lobbyPlayers: { id: string; name: string }[] = [];

  dataSource: GamesDataSource;
  displayedColumns = ['name', 'owner', 'createdAt', 'state'];

  private readonly userService = inject(UserService);
  private readonly gamesService = inject(GamesService);
  private readonly router = inject(Router);
  readonly graphqlClient = inject(GraphqlClientService);

  constructor() {
    this.dataSource = new GamesDataSource(this.gamesService, this.graphqlClient);
  }

  ngOnInit() {
    this.dataSource.loadGames();
    this.loadLobbyPlayers();
  }

  async loadLobbyPlayers() {
    try {
      const { data } = await this.graphqlClient.client.models.User.list();

      const uniqueUsers = new Map<string, Schema['User']['type']>();
      data
        .filter((user) => !user.gameId && !user.isGuest) // Exclude guests from lobby
        .forEach((user) => {
          const key = user.profileOwner ?? user.id;
          if (!uniqueUsers.has(key)) {
            uniqueUsers.set(key, user);
          }
        });

      this.lobbyPlayers = Array.from(uniqueUsers.values()).map((user) => ({
        id: user.id,
        name: user.name ?? 'Tuntematon',
      }));
    } catch (error) {
      console.error('Error loading lobby players:', error);
      this.lobbyPlayers = [];
    }
  }

  async getUserProfile() {
    try {
      if (this.graphqlClient.isGuest) {
        // For guests, look up by guestId
        const guestId = localStorage.getItem('guestId');
        if (!guestId) return null;

        const { data, errors } = await this.graphqlClient.client.models['User']['list']({
          filter: {
            guestId: { eq: guestId },
          },
        });
        if (errors) {
          console.error('Error fetching guest user:', errors);
          return null;
        }

        // If guest user doesn't exist, create it
        if (!data || data.length === 0) {
          const guestName = `Vieras_${guestId.slice(-4)}`;
          const createResult = await this.graphqlClient.client.models['User']['create']({
            name: guestName,
            isGuest: true,
            guestId,
          });
          return createResult.data;
        }

        return data[0];
      } else {
        // For authenticated users, look up by profileOwner
        const { data, errors } = await this.graphqlClient.client.models['User']['list']({
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

        // If authenticated user doesn't exist, create it
        if (!data || data.length === 0) {
          console.log('User attributes:', this.userAttributes);
          const nickname = this.userAttributes?.nickname ?? 'Unknown User';
          console.log('Creating user with nickname:', nickname);
          const createResult = await this.graphqlClient.client.models['User']['create']({
            name: nickname,
            profileOwner: `${this.user?.userId}::${this.user?.username ?? this.user?.userId}`,
            isGuest: false,
          });
          console.log('Created user:', createResult.data);
          return createResult.data;
        }

        return data[0];
      }
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
      const gameResult = await this.graphqlClient.client.models['Game']['list']({
        filter: { id: { eq: id } },
      });
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

      await this.graphqlClient.client.models['User']['update']({
        id: user.id,
        gameId: id,
      });
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

      const game = await this.graphqlClient.client.models['Game']['create']({
        name,
        hostedBy: host,
        state: 'joinable',
      });

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
    return this.userAttributes?.nickname ?? 'Unknown';
  }

  async deleteGame(id: string) {
    try {
      await this.graphqlClient.client.models['Game']['update']({
        id,
        state: 'finished',
      });
    } catch (error) {
      console.error('Error deleting game:', error);
    }
  }

  onRowClicked(game: Game) {
    this.router.navigate(['/game', game.id]);
  }

  viewProfile() {
    this.router.navigate(['/profile']);
  }
}
