import { CommonModule } from '@angular/common';
import {
  Component,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewChecked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { fetchUserAttributes } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/data';
import { Subscription } from 'rxjs';
import type { Schema } from '../../../amplify/data/resource';

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
          <span class="sender">{{ message.senderName }}:</span>
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
        margin-bottom: 4px;
        word-wrap: break-word;
      }
      .sender {
        font-weight: bold;
        color: #007bff;
      }
      .content {
        margin-left: 4px;
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
  private readonly client = generateClient<Schema>();
  private senderName = 'Sinä';
  private lastMessageTime = 0;
  private readonly MESSAGE_DELAY = 2000;

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
      const userAttributes = await fetchUserAttributes();
      this.senderName = userAttributes.nickname ?? 'Sinä';
    } catch (error) {
      console.error('Error loading user attributes:', error);
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

      await this.client.models.Message.create({
        content: messageContent,
        senderName: this.senderName,
        contextType: this.contextType,
        contextId: this.contextId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error sending message:', error);
      // Restore message on error
      this.newMessage = messageContent;
    }
  }
}
