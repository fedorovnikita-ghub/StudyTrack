import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { config } from './config';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    MongooseModule.forRoot(config.mongodbUri, {
      serverSelectionTimeoutMS: 10_000,
      maxPoolSize: 20,
    }),
  ],
  controllers: [HealthController],
})
export class AppModule {}
