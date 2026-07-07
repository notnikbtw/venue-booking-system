import { JwtAuthGuard } from '@common/guard/jwt-auth.guard';
import {
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';

import { AppModule } from '@/app.module';
import { Booking } from '@/modules/booking/entities/booking.entity';

describe('Booking System', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: context => {
          const request = context.switchToHttp().getRequest();
          const authHeader = request.headers.authorization;

          if (
            !authHeader ||
            !authHeader.startsWith('Bearer ') ||
            authHeader === 'Bearer '
          ) {
            throw new UnauthorizedException();
          }

          request.user = { id: 1 };
          return true;
        },
      })
      .overrideProvider(getRepositoryToken(Booking))
      .useValue({
        findOne: jest.fn().mockImplementation(options => {
          if (options.where && options.where.id === 1) {
            return {
              id: 1,
              bookingDate: '2026-01-01',
              bookingTime: '18:00',
              numberOfGuests: 2,
              status: 'confirmed',
              user: { id: 1, name: 'John Doe' },
              establishment: { id: 1, name: 'Restaurant' },
            };
          }

          return null;
        }),

        find: jest.fn().mockResolvedValue([
          {
            id: 1,
            bookingDate: '2026-01-01',
            bookingTime: '18:00',
            numberOfGuests: 2,
            status: 'confirmed',
          },
          {
            id: 2,
            bookingDate: '2026-01-02',
            bookingTime: '20:00',
            numberOfGuests: 4,
            status: 'confirmed',
          },
        ]),

        createQueryBuilder: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue({ sum: '0' }),
        }),

        create: jest.fn().mockImplementation(dto => dto),

        save: jest.fn().mockImplementation(dto => {
          return {
            id: 1,
            ...dto,
            status: 'confirmed',
          };
        }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('POST /booking', () => {
    it('should respond with 201 on successful booking', async () => {
      const response = await request(app.getHttpServer())
        .post('/booking')
        .set('Authorization', 'Bearer fake-jwt-token')
        .send({
          establishment: 1,
          bookingDate: '2026-01-01',
          bookingTime: '18:00',
          numberOfGuests: 2,
        });

      expect(response.statusCode).toBe(201);
    });

    it('should respond with 401 if user is not authorized', async () => {
      const response = await request(app.getHttpServer())
        .post('/booking')
        .send({
          establishment: 1,
          bookingDate: '2026-01-01',
          bookingTime: '18:00',
          numberOfGuests: 2,
        });

      expect(response.statusCode).toBe(401);
      expect(response.body.message).toBe('Unauthorized');
    });

    it('should respond with 400 if input data is invalid', async () => {
      const response = await request(app.getHttpServer())
        .post('/booking')
        .set('Authorization', 'Bearer fake-jwt-token')
        .send({
          establishment: 1,
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
      expect(response.body.length).toBe(2);
      expect(response.body[0]).toHaveProperty('id', 1);
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
        '/booking/establishment/1'
      );

      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should respond with 404 if establishment is not found', async () => {
      const response = await request(app.getHttpServer()).get(
        '/booking/establishment/9999'
      );

      expect(response.statusCode).toBe(404);
      expect(response.body.message).toBe('Establishment 9999 not found');
    });
  });

  describe('GET /booking/:id', () => {
    it('should respond with 200 on successful found by ID', async () => {
      const response = await request(app.getHttpServer())
        .get('/booking/1')
        .set('Authorization', 'Bearer fake-jwt-token');

      expect(response.statusCode).toBe(200);

      expect(response.body).toHaveProperty('id', 1);
      expect(response.body.status).toBe('confirmed');
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
