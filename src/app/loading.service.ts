import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

// This service manages the loading state of the application.
// It provides methods to turn loading on and off, and exposes an observable
// that components can subscribe to in order to react to loading state changes.
// It is typically used to show a loading spinner or indicator while data is being fetched or processed.
// The loading state is managed using a BehaviorSubject, which allows components to
// get the current loading state and also react to future changes.
@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private readonly loadingSubject =
    new BehaviorSubject<boolean>(false);

  loading$ = this.loadingSubject.asObservable();

  loadingOn() {
    this.loadingSubject.next(true);
  }

  loadingOff() {
    this.loadingSubject.next(false);
  }
}
