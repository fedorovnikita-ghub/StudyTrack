import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, ConnectionStates } from 'mongoose';
import { serviceUnavailable } from '../common/app-error';

@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  // GET /api/v1/health - жив ли API и есть ли связь с базой
  @Get()
  check() {
    if (this.connection.readyState !== ConnectionStates.connected) {
      throw serviceUnavailable('DB_UNAVAILABLE', 'База данных временно недоступна');
    }
    return { status: 'ok', db: 'up', time: new Date().toISOString() };
  }
}
