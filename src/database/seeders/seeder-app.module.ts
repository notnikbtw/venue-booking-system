import { typeOrmConfig } from '@config/typeorm.config';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SeederModule } from '@/database/seeders/seeder.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
    }),
    TypeOrmModule.forRoot(typeOrmConfig),
    SeederModule,
  ],
})
export class SeederAppModule {}
// to avoid raising the entire App module, a separate module for connecting the database
