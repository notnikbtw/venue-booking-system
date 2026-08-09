import { JwtAuthGuard } from '@common/guard/jwt-auth.guard';
import {
  Booking,
  BookingStatus,
} from '@modules/booking/entities/booking.entity';
import { Establishment } from '@modules/establishment/entities/establishment.entity';
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

describe('Booking System', () => {
  let app: INestApplication;
  let userRepo: Repository<User>;
  let bookingRepo: Repository<Booking>;
  let establishmentRepo: Repository<Establishment>;
  let seededUser: User;
  let seededBooking: Booking;
  let seededEstablishment: Establishment;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: context => {
          const req = context.switchToHttp().getRequest();
          const authHeader = req.headers.authorization;

          if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new UnauthorizedException();
          }

          req.user = {
            id: seededUser?.id ?? 1,
            role: seededUser?.role ?? UserRole.USER,
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
              entities: [User, Booking, Establishment],
              synchronize: true,
            };
          }
          return 'some-value';
        },
        getOrThrow: () => 'some-value',
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    userRepo = moduleFixture.get(getRepositoryToken(User));
    bookingRepo = moduleFixture.get(getRepositoryToken(Booking));
    establishmentRepo = moduleFixture.get(getRepositoryToken(Establishment));
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await bookingRepo.createQueryBuilder().delete().execute();
    await userRepo.createQueryBuilder().delete().execute();
    await establishmentRepo.createQueryBuilder().delete().execute();

    seededUser = await userRepo.save({
      name: 'John Doe',
      email: 'john@example.com',
      password: await bcrypt.hash('Password123', 10),
      phoneNumber: '+380966243761',
      avatarUrl: 'https://example.com/avatar.png',
      role: UserRole.SUPER_ADMIN,
    });

    seededEstablishment = await establishmentRepo.save({
      name: 'Restaurant',
      address: '123 Main St',
      description: 'A nice restaurant',
      totalSeats: 50,
      owner: seededUser,
    });

    seededBooking = await bookingRepo.save({
      bookingDate: new Date('2026-01-01'),
      bookingTime: '18:00',
      numberOfGuests: 2,
      status: BookingStatus.CONFIRMED,
      user: seededUser,
      establishment: seededEstablishment,
    });
  });

  describe('POST /booking', () => {
    it('should respond with 201 on successful booking', async () => {
      const response = await request(app.getHttpServer())
        .post('/booking')
        .set('Authorization', 'Bearer fake-jwt-token')
        .send({
          establishment: seededEstablishment?.id,
          bookingDate: '2026-01-01',
          bookingTime: '18:00',
          numberOfGuests: 2,
        });

      expect(response.statusCode).toBe(201);
    });

    it('should respond with 401 if user is not authorized', async () => {
      const response = await request(app.getHttpServer()).post('/booking');

      expect(response.statusCode).toBe(401);
      expect(response.body.message).toBe('Unauthorized');
    });

    it('should respond with 400 if input data is invalid', async () => {
      const response = await request(app.getHttpServer())
        .post('/booking')
        .set('Authorization', 'Bearer fake-jwt-token')
        .send({
          establishment: seededEstablishment?.id,
          bookingDate: '',
          bookingTime: '18:00',
          numberOfGuests: 2,
        });

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('message');
    });

    it('should respond with 404 if establishment does not exist', async () => {
      const response = await request(app.getHttpServer())
        .post('/booking')
        .set('Authorization', 'Bearer fake-jwt-token')
        .send({
          establishment: 9999,
          bookingDate: '2026-01-01',
          bookingTime: '18:00',
          numberOfGuests: 2,
        });

      expect(response.statusCode).toBe(404);
      expect(response.body.message).toBe('Establishment not found');
    });
  });

  describe('GET /booking', () => {
    it('should return all bookings', async () => {
      const response = await request(app.getHttpServer())
        .get('/booking')
        .set('Authorization', 'Bearer fake-jwt-token');

      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0]).toHaveProperty('id', seededBooking?.id);
    });

    it('should respond with 401 if user is not authorized', async () => {
      const response = await request(app.getHttpServer()).get('/booking');

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /my-bookings', () => {
    it('should return user booking', async () => {
      const response = await request(app.getHttpServer())
        .get('/booking/my-bookings')
        .set('Authorization', 'Bearer fake-jwt-token');

      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      if (response.body.length > 0) {
        const firstBooking = response.body[0];
        expect(firstBooking).toHaveProperty('id');
        expect(firstBooking).toHaveProperty('bookingDate');
        expect(firstBooking).toHaveProperty('bookingTime');
        expect(firstBooking).toHaveProperty('status');
      }
    });

    it('should respond with 401 if user is not authorized', async () => {
      const response = await request(app.getHttpServer()).get(
        '/booking/my-bookings'
      );

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET establishment/:establishmentId', () => {
    it('should return establishment bookings', async () => {
      const response = await request(app.getHttpServer()).get(
        `/booking/establishment/${seededEstablishment?.id}`
      );

      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  describe('GET /booking/:id', () => {
    it('should respond with 200 on successful found by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/booking/${seededBooking?.id}`)
        .set('Authorization', 'Bearer fake-jwt-token');

      expect(response.statusCode).toBe(200);

      expect(response.body).toHaveProperty('id', seededBooking?.id);
      expect(response.body.status).toBe(BookingStatus.CONFIRMED);
    });

    it('should respond with 401 if user is not authorized', async () => {
      const response = await request(app.getHttpServer()).get('/booking/1');

      expect(response.statusCode).toBe(401);
      expect(response.body.message).toBe('Unauthorized');
    });

    it('should respond with 404 if booking is not found by ID', async () => {
      const response = await request(app.getHttpServer())
        .get('/booking/9999')
        .set('Authorization', 'Bearer fake-jwt-token');

      expect(response.statusCode).toBe(404);
      expect(response.body.message).toBe('Booking 9999 not found');
    });
  });
});
