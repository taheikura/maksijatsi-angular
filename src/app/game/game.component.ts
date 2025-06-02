import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-game',
  imports: [],
  template: `<p>game works!</p>`,
  styleUrl: './game.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameComponent { }
