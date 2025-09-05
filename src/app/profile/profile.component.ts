import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { fetchUserAttributes, UserAttributeKey } from 'aws-amplify/auth';
import { UserService } from '../user.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
})
export class ProfileComponent implements OnInit {
  userAttributes: Partial<Record<UserAttributeKey, string>> | null = null;
  user: unknown = null;

  private readonly userService = inject(UserService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    this.loadProfile();
  }

  private async loadProfile(): Promise<void> {
    try {
      this.user = await this.userService.fetchData();
      this.userAttributes = await fetchUserAttributes();
    } catch (error) {
      console.error('Error loading profile', error);
    }
  }

  goBack() {
    this.router.navigate(['/home']);
  }
}
