import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { config } from './config';
import { CoursesModule } from './courses/courses.module';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    MongooseModule.forRoot(config.mongodbUri, {
      serverSelectionTimeoutMS: 10_000,
      maxPoolSize: 20,
    }),
    DatabaseModule,
    AuthModule,
    CategoriesModule,
    CoursesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
