import { CommonModule } from '@angular/common';
import {
  AfterViewChecked,
  Component,
  ElementRef,
  inject,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { fetchUserAttributes } from 'aws-amplify/auth';
import { Subscription } from 'rxjs';
import { GraphqlClientService } from '../shared/graphql-client.service';

interface Message {
  id: string;
  content: string;
  senderName: string;
  timestamp: string;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="chat-container">
      <div class="chat-messages" #messagesContainer>
        <div *ngFor="let message of messages" class="message">
          <span class="sender">{{ message.senderName }}</span>
          <span class="timestamp">{{ formatTimestamp(message.timestamp) }}</span>
          <span class="content">{{ message.content }}</span>
        </div>
      </div>
      <div class="chat-input">
        <input
          [(ngModel)]="newMessage"
          (keyup.enter)="sendMessage()"
          placeholder="Kirjoita viesti..."
          maxlength="200"
        />
      </div>
    </div>
  `,
  styles: [
    `
      .chat-container {
        display: flex;
        flex-direction: column;
        height: 200px;
        border: 1px solid #ddd;
        border-radius: 4px;
        background: white;
      }
      .chat-messages {
        flex: 1;
        overflow-y: auto;
        padding: 8px;
        font-size: 14px;
      }
      .message {
        margin-bottom: 2px;
        word-wrap: break-word;
        line-height: 1.2;
      }
      .sender {
        font-weight: bold;
        color: #007bff;
      }
      .timestamp {
        font-size: 10px;
        color: #666;
        margin-left: 4px;
      }
      .content {
        margin-left: 4px;
        word-wrap: break-word;
      }
      .chat-input {
        padding: 8px;
        border-top: 1px solid #eee;
      }
      .chat-input input {
        width: 100%;
        padding: 6px 8px;
        border: 1px solid #ddd;
        border-radius: 3px;
        box-sizing: border-box;
      }
      .chat-input input:focus {
        outline: none;
        border-color: #007bff;
      }
      .chat-messages::-webkit-scrollbar {
        width: 6px;
      }
      .chat-messages::-webkit-scrollbar-thumb {
        background: #ccc;
        border-radius: 3px;
      }
    `,
  ],
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @Input() contextType: 'lobby' | 'game' = 'lobby';
  @Input() contextId: string | null = null;
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  messages: Message[] = [];
  newMessage = '';
  private subscription?: Subscription;
  private readonly graphqlClient = inject(GraphqlClientService);
  private senderName = 'Sinä';
  private lastMessageTime = 0;
  private readonly MESSAGE_DELAY = 2000;

  private get client() {
    return this.graphqlClient.client;
  }

  ngOnInit(): void {
    this.loadUserAttributes();
    this.loadMessages();
    this.subscribeToMessages();
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    if (this.messagesContainer) {
      const element = this.messagesContainer.nativeElement;
      element.scrollTop = element.scrollHeight;
    }
  }

  private async loadUserAttributes(): Promise<void> {
    try {
      if (this.graphqlClient.isGuest) {
        // For guests, use stored guest name or generate one
        const guestId = localStorage.getItem('guestId') ?? 'guest';
        this.senderName = `Vieras_${guestId.slice(-4)}`;
      } else {
        const userAttributes = await fetchUserAttributes();
        this.senderName = userAttributes.nickname ?? 'Sinä';
      }
    } catch (error) {
      console.error('Error loading user attributes:', error);
      // Fallback for guests
      if (this.graphqlClient.isGuest) {
        const guestId = localStorage.getItem('guestId') ?? 'guest';
        this.senderName = `Vieras_${guestId.slice(-4)}`;
      }
    }
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }

  private async loadMessages() {
    try {
      if (!this.client.models.Message) {
        console.warn('Message model not available');
        return;
      }
      const { data } = await this.client.models.Message.list({
        filter: {
          contextType: { eq: this.contextType },
          ...(this.contextId ? { contextId: { eq: this.contextId } } : {}),
        },
      });
      this.messages = data
        .map((m) => ({
          id: m.id,
          content: m.content,
          senderName: m.senderName,
          timestamp: m.timestamp,
        }))
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      setTimeout(() => this.scrollToBottom(), 0);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }

  private subscribeToMessages() {
    try {
      if (!this.client.models.Message?.observeQuery) {
        console.warn('Message observeQuery not available');
        return;
      }
      this.subscription = this.client.models.Message.observeQuery({
        filter: {
          contextType: { eq: this.contextType },
          ...(this.contextId ? { contextId: { eq: this.contextId } } : {}),
        },
      }).subscribe({
        next: ({ items }) => {
          this.messages = items
            .map((m) => ({
              id: m.id,
              content: m.content,
              senderName: m.senderName,
              timestamp: m.timestamp,
            }))
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          setTimeout(() => this.scrollToBottom(), 0);
        },
      });
    } catch (error) {
      console.error('Error subscribing to messages:', error);
    }
  }

  formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  async sendMessage() {
    const messageContent = this.newMessage.trim();
    if (!messageContent) return;

    const now = Date.now();
    if (now - this.lastMessageTime < this.MESSAGE_DELAY) {
      return;
    }
    this.lastMessageTime = now;

    // Clear input immediately for better UX
    this.newMessage = '';

    try {
      if (!this.client.models.Message) {
        console.warn('Message model not available - adding message locally');
        // Fallback: add message locally
        const localMessage: Message = {
          id: Date.now().toString(),
          content: messageContent,
          senderName: 'Sinä',
          timestamp: new Date().toISOString(),
        };
        this.messages.push(localMessage);
        setTimeout(() => this.scrollToBottom(), 0);
        return;
      }

      const now = new Date();
      const ttl = Math.floor(now.getTime() / 1000) + 86400; // 24 hours from now

      await this.client.models.Message.create({
        content: messageContent,
        senderName: this.senderName,
        contextType: this.contextType,
        contextId: this.contextId,
        timestamp: now.toISOString(),
        ttl,
      });
    } catch (error) {
      console.error('Error sending message:', error);
      // Restore message on error
      this.newMessage = messageContent;
    }
  }
}
