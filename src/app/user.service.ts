import { Injectable } from '@angular/core';
import { AuthUser, getCurrentUser } from 'aws-amplify/auth';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  fetchData(): Promise<AuthUser> {
    return getCurrentUser();
  }
}
