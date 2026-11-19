import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { Server } from 'socket.io';
import { User, USER_MODEL } from '../models';

export type RealtimeEventType = 'submission.created' | 'grade.changed';

// В событии только идентификаторы: актуальные данные клиент перечитывает через API
export interface RealtimeEvent {
  type: RealtimeEventType;
  submissionId: string;
  assignmentId: string;
  courseId: string;
  studentId: string;
}

export function userRoom(userId: string): string {
  return `user:${userId}`;
}

@Injectable()
export class RealtimeService {
  private readonly logger = new Logger('Realtime');
  private server: Server | null = null;

  constructor(@InjectModel(USER_MODEL) private readonly users: Model<User>) {}

  attach(server: Server): void {
    this.server = server;
  }

  // Отправка события только указанным пользователям (в их личные комнаты).
  // Вызывается после успешного сохранения. Ошибка отправки не ломает основную операцию,
  // а доставка каждого события не гарантируется: при переподключении клиент перечитывает данные
  async notify(event: RealtimeEvent, userIds: string[]): Promise<void> {
    if (!this.server) return;
    try {
      const ids = [...new Set(userIds)];
      const active = await this.users
        .find({ _id: { $in: ids }, active: true })
        .select('_id')
        .lean();
      const activeIds = new Set(active.map((u) => String(u._id)));

      for (const id of ids) {
        if (!activeIds.has(id)) {
          // Аккаунт отключен: закрываем его открытые соединения
          this.server.in(userRoom(id)).disconnectSockets(true);
        }
      }

      const rooms = ids.filter((id) => activeIds.has(id)).map(userRoom);
      if (rooms.length > 0) {
        this.server.to(rooms).emit(event.type, event);
      }
    } catch (err) {
      this.logger.warn(`Не удалось отправить событие ${event.type}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
