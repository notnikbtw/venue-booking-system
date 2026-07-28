import { validationSchema } from '@config/env.validation';
import { throttlerConfig } from '@config/throttler.config';
import { typeOrmConfig } from '@config/typeorm.config';
import { AuthModule } from '@modules/auth/auth.module';
import { BookingModule } from '@modules/booking/booking.module';
import { CommentModule } from '@modules/comment/comment.module';
import { EstablishmentModule } from '@modules/establishment/establishment.module';
import { EstablishmentTypeModule } from '@modules/establishment-type/establishment-type.module';
import { FeaturesModule } from '@modules/features/features.module';
import { ScheduleModule } from '@modules/schedule/schedule.module';
import { UsersModule } from '@modules/users/users.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';

import { SeederModule } from '@/database/seeders/seeder.module';

@Module({
  imports: [
    ThrottlerModule.forRoot(throttlerConfig),
    TypeOrmModule.forRoot(typeOrmConfig),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
      validationSchema,
      validationOptions: {
        abortEarly: true,
        allowUnknown: true,
        convert: true,
      },
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  singleLine: true,
                  messageFormat: '{msg}',
                  translateTime: false,
                  ignore: 'req,res,responseTime,pid,hostname',
                },
              }
            : undefined,

        level: process.env.NODE_ENV !== 'production' ? 'debug' : 'info',

        serializers: {
          req: req => ({ method: req.method, url: req.url }),
          res: res => ({ statusCode: res.statusCode }),
        },

        customSuccessMessage: (req, res, responseTime) => {
          return `${req.method} ${req.url} completed with status ${res.statusCode} in ${responseTime}ms`;
        },

        customErrorMessage: (req, res, err) => {
          return `${req.method} ${req.url} failed with status ${res.statusCode} - Error: ${err.message}`;
        },
      },
    }),
    EstablishmentModule,
    CommentModule,
    AuthModule,
    BookingModule,
    UsersModule,
    FeaturesModule,
    EstablishmentTypeModule,
    SeederModule,
    ScheduleModule,
  ],
  controllers: [],
})
export class AppModule {}
