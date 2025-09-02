import { Component, ContentChild, Input, TemplateRef, OnInit, inject } from '@angular/core';
import { LoadingService } from '../loading.service';
import { RouteConfigLoadEnd, RouteConfigLoadStart, Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AsyncPipe, NgTemplateOutlet } from '@angular/common';

@Component({
  selector: 'app-loading-indicator',
  imports: [MatProgressSpinnerModule, AsyncPipe, NgTemplateOutlet],
  templateUrl: './loading-indicator.component.html',
  styleUrl: './loading-indicator.component.css',
  standalone: true,
})
export class LoadingIndicatorComponent implements OnInit {
  loading$: Observable<boolean>;

  @Input()
  detectRouteTransitions = false;

  @ContentChild('loading')
  customLoadingIndicator: TemplateRef<unknown> | null = null;

  private readonly loadingService = inject(LoadingService);
  private readonly router = inject(Router);

  constructor() {
    this.loading$ = this.loadingService.loading$;
  }

  ngOnInit() {
    if (this.detectRouteTransitions) {
      this.router.events
        .pipe(
          tap((event) => {
            if (event instanceof RouteConfigLoadStart) {
              this.loadingService.loadingOn();
            } else if (event instanceof RouteConfigLoadEnd) {
              this.loadingService.loadingOff();
            }
          })
        )
        .subscribe();
    }
  }
}
