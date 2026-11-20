import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiErrors, ApiSuccess } from '../common/swagger';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, ConnectionStates } from 'mongoose';
import { Public } from '../auth/decorators';
import { serviceUnavailable } from '../common/app-error';

@ApiTags('Служебное')
@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  // GET /api/v1/health - жив ли API и есть ли связь с базой
  @Public()
  @ApiOperation({ summary: 'Проверка API и связи с базой' })
  @ApiSuccess(200, 'API и база доступны', { status: 'ok', db: 'up', time: '2026-11-20T06:00:00.000Z' })
  @ApiErrors(503)
  @Get()
  check() {
    if (this.connection.readyState !== ConnectionStates.connected) {
      throw serviceUnavailable('DB_UNAVAILABLE', 'База данных временно недоступна');
    }
    return { status: 'ok', db: 'up', time: new Date().toISOString() };
  }
}
