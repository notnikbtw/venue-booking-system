import { JwtAuthGuard } from '@common/guard/jwt-auth.guard';
import { Booking } from '@modules/booking/entities/booking.entity';
import { Establishment } from '@modules/establishment/entities/establishment.entity';
import {
  Schedule,
  ScheduleDays,
} from '@modules/schedule/entities/schedule.entity';
import { User, UserRole } from '@modules/users/entities/user.entity';
import {
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { Repository } from 'typeorm';

import { AppModule } from '@/app.module';

describe('Schedule', () => {
  let app: INestApplication;
  let userRepo: Repository<User>;
  let scheduleRepo: Repository<Schedule>;
  let establishmentRepo: Repository<Establishment>;
  // let bookingRepo: Repository<Booking>;
  let seededUser: User;
  let seededSchedule: Schedule;
  let seededEstablishment: Establishment;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: context => {
          const request = context.switchToHttp().getRequest();
          const authHeader = request.headers.authorization;

          if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new UnauthorizedException();
          }

          request.user = {
            id: seededUser?.id ?? 1,
            role: seededUser?.role ?? UserRole.SUPER_ADMIN,
          };
          return true;
        },
      })
      .overrideProvider(ConfigService)
      .useValue({
        get: (key: string) => {
          if (key === 'database') {
            return {
              type: 'better-sqlite3',
              database: ':memory:',
              entities: [User, Schedule, Establishment, Booking],
              synchronize: true,
            };
          }
          return 'some-value';
        },
        getOrThrow: () => 'some-value',
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    userRepo = moduleFixture.get(getRepositoryToken(User));
    scheduleRepo = moduleFixture.get(getRepositoryToken(Schedule));
    establishmentRepo = moduleFixture.get(getRepositoryToken(Establishment));
    // bookingRepo = moduleFixture.get(getRepositoryToken(Booking))
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // await bookingRepo.createQueryBuilder().delete().execute();
    await scheduleRepo.createQueryBuilder().delete().execute();
    await establishmentRepo.createQueryBuilder().delete().execute();
    await userRepo.createQueryBuilder().delete().execute();

    seededUser = await userRepo.save({
      name: 'John Doe',
      email: 'john@example.com',
      password: await bcrypt.hash('Password123', 10),
      phoneNumber: '+380966243761',
      avatarUrl: 'https://example.com/avatar.png',
      role: UserRole.SUPER_ADMIN,
    });

    seededEstablishment = await establishmentRepo.save({
      name: 'Establishment',
      description: 'Description',
      pricePerHour: 100,
      address: 'Address',
      maxGuests: 10,
      owner: seededUser,
    });

    seededSchedule = await scheduleRepo.save({
      day: ScheduleDays.MONDAY,
      openTime: '10:00',
      closeTime: '20:00',
      establishment: seededEstablishment,
    });
  });

  describe('POST /schedule', () => {
    it('should return 201 and create schedule', async () => {
      const response = await request(app.getHttpServer())
        .post('/schedule')
        .set('Authorization', 'Bearer fake-jwt-token')
        .send({
          establishmentId: seededEstablishment.id,
          scheduleItems: [
            {
              day: [ScheduleDays.TUESDAY],
              openTime: '10:00',
              closeTime: '20:00',
            },
          ],
        });

      expect(response.statusCode).toBe(201);
    });

    it('should return 401 if user is not authenticated', async () => {
      const response = await request(app.getHttpServer())
        .post('/schedule')
        .send({
          establishmentId: seededEstablishment.id,
          scheduleItems: [
            {
              day: [ScheduleDays.TUESDAY],
              openTime: '10:00',
              closeTime: '20:00',
            },
          ],
        });

      expect(response.statusCode).toBe(401);
    });

    it('should return 400 when schedule items are empty', async () => {
      const response = await request(app.getHttpServer())
        .post('/schedule')
        .set('Authorization', 'Bearer fake-jwt-token')
        .send({
          establishmentId: seededEstablishment.id,
          scheduleItems: [],
        });

      expect(response.statusCode).toBe(400);
    });

    it('should return 404 when schedule not found', async () => {
      const response = await request(app.getHttpServer())
        .post('/schedule')
        .set('Authorization', 'Bearer fake-jwt-token')
        .send({
          establishmentId: 999999,
          scheduleItems: [
            {
              day: [ScheduleDays.TUESDAY],
              openTime: '10:00',
              closeTime: '20:00',
            },
          ],
        });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /schedule/:establishmentId', () => {
    it('should return 200 and schedule', async () => {
      const response = await request(app.getHttpServer()).get(
        `/schedule/${seededEstablishment.id}`
      );

      expect(response.statusCode).toBe(200);
    });

    it('should return 404 when establishment not found', async () => {
      const response = await request(app.getHttpServer()).get(
        `/schedule/999999`
      );

      expect(response.statusCode).toBe(404);
    });

    it('should return 400 when establishment id is not valid', async () => {
      const response = await request(app.getHttpServer()).get(
        `/schedule/invalid`
      );

      expect(response.statusCode).toBe(400);
    });
  });

  describe('PATCH /schedule/:id', () => {
    it('should return 200 and updated schedule', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/schedule/${seededSchedule.id}`)
        .set('Authorization', 'Bearer fake-jwt-token')
        .send({
          openTime: '11:00',
          closeTime: '21:00',
        });

      expect(response.statusCode).toBe(200);
    });

    it('should return 404 when schedule not found', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/schedule/999999`)
        .set('Authorization', 'Bearer fake-jwt-token')
        .send({
          openTime: '11:00',
          closeTime: '21:00',
        });

      expect(response.statusCode).toBe(404);
    });

    it('should return 401 when user is not authenticated', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/schedule/${seededSchedule.id}`)
        .send({
          openTime: '11:00',
          closeTime: '21:00',
        });

      expect(response.statusCode).toBe(401);
    });

    it('should return 400 when open time is invalid', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/schedule/${seededSchedule.id}`)
        .set('Authorization', 'Bearer fake-jwt-token')
        .send({
          openTime: 'invalid',
          closeTime: '21:00',
        });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 when close time is invalid', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/schedule/${seededSchedule.id}`)
        .set('Authorization', 'Bearer fake-jwt-token')
        .send({
          openTime: '11:00',
          closeTime: 'invalid',
        });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 when schedule id is not valid', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/schedule/invalid`)
        .set('Authorization', 'Bearer fake-jwt-token')
        .send({
          openTime: '11:00',
          closeTime: '21:00',
        });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('DELETE /schedule/:id', () => {
    it('should return 200 and delete schedule', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/schedule/${seededSchedule.id}`)
        .set('Authorization', 'Bearer fake-jwt-token');

      expect(response.statusCode).toBe(200);
    });

    it('should return 404 when schedule not found', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/schedule/999999`)
        .set('Authorization', 'Bearer fake-jwt-token');

      expect(response.statusCode).toBe(404);
    });

    it('should return 401 when user is not authenticated', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/schedule/${seededSchedule.id}`)
        .send();

      expect(response.statusCode).toBe(401);
    });

    it('should return 400 when schedule id is not valid', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/schedule/invalid`)
        .set('Authorization', 'Bearer fake-jwt-token');

      expect(response.statusCode).toBe(400);
    });
  });
});
