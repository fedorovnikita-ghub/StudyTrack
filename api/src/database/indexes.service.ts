import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

// Mongoose создает индексы сам при запуске, но ошибку молча откладывает.
// Здесь дожидаемся создания и пишем результат в лог
@Injectable()
export class IndexesService implements OnApplicationBootstrap {
  private readonly logger = new Logger('Indexes');

  constructor(@InjectConnection() private readonly connection: Connection) {}

  async onApplicationBootstrap() {
    for (const model of Object.values(this.connection.models)) {
      try {
        await model.init();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`Не удалось создать индексы коллекции ${model.collection.name}: ${message}`);
      }
    }
    this.logger.log('Индексы проверены');
  }
}
