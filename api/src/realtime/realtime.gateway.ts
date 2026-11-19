import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { AuthService } from '../auth/auth.service';
import { AppError } from '../common/app-error';
import { config } from '../config';
import { RealtimeService, userRoom } from './realtime.service';

interface ClientData {
  userId?: string;
  expiryTimer?: NodeJS.Timeout;
}

// Socket.IO на том же порту, что и API. Клиент передает JWT в handshake.auth.token.
// Подписок по выбору клиента нет: сервер сам кладет сокет в личную комнату пользователя,
// поэтому чужие события получить нельзя
@WebSocketGateway({ cors: { origin: config.webOrigins } })
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger('Realtime');

  constructor(
    private readonly authService: AuthService,
    private readonly realtime: RealtimeService,
  ) {}

  afterInit(server: Server): void {
    this.realtime.attach(server);
  }

  async handleConnection(client: Socket): Promise<void> {
    const token: unknown = client.handshake.auth?.token;
    if (typeof token !== 'string' || !token) {
      this.reject(client, 'Требуется вход');
      return;
    }

    try {
      // Те же проверки, что и для REST: подпись, срок, существование и активность аккаунта
      const user = await this.authService.verifyToken(token);
      if (!client.connected) return; // клиент ушел, пока шла проверка

      const data = client.data as ClientData;
      data.userId = user.id;
      await client.join(userRoom(user.id));

      // По истечении токена закрытые подписки останавливаются
      const expiresAt = this.authService.tokenExpiresAt(token);
      if (expiresAt) {
        data.expiryTimer = setTimeout(
          () => {
            client.emit('session.expired');
            client.disconnect(true);
          },
          Math.max(expiresAt.getTime() - Date.now(), 0),
        );
        data.expiryTimer.unref(); // таймер не держит процесс при остановке сервера
      }

      client.emit('realtime.ready');
    } catch (err) {
      if (err instanceof AppError && err.getStatus() === 401) {
        this.reject(client, 'Сессия истекла или недействительна');
        return;
      }
      this.logger.warn(`Ошибка проверки Socket-подключения: ${err instanceof Error ? err.message : String(err)}`);
      this.reject(client, 'Не удалось проверить вход. Повторите позже');
    }
  }

  handleDisconnect(client: Socket): void {
    const data = client.data as ClientData;
    if (data.expiryTimer) clearTimeout(data.expiryTimer);
  }

  private reject(client: Socket, message: string): void {
    client.emit('auth.error', { message });
    client.disconnect(true);
  }
}
