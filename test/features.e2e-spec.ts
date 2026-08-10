import { JwtAuthGuard } from '@common/guard/jwt-auth.guard';
import { Booking } from '@modules/booking/entities/booking.entity';
import { Establishment } from '@modules/establishment/entities/establishment.entity';
import { Feature } from '@modules/features/entities/feature.entity';
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

describe('Features', () => {
  let app: INestApplication;
  let userRepo: Repository<User>;
  let bookingRepo: Repository<Booking>;
  let featureRepo: Repository<Feature>;
  let seededUser: User;
  let seededFeature: Feature;

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
              entities: [User, Booking, Establishment, Feature],
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
    featureRepo = moduleFixture.get(getRepositoryToken(Feature));
    bookingRepo = moduleFixture.get(getRepositoryToken(Booking));
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await bookingRepo.createQueryBuilder().delete().execute();
    await userRepo.createQueryBuilder().delete().execute();
    await featureRepo.createQueryBuilder().delete().execute();

    seededUser = await userRepo.save({
      name: 'John Doe',
      email: 'john@example.com',
      password: await bcrypt.hash('Password123', 10),
      phoneNumber: '+380966243761',
      avatarUrl: 'https://example.com/avatar.png',
      role: UserRole.SUPER_ADMIN,
    });

    seededFeature = await featureRepo.save({
      name: 'WiFi',
      image: 'https://example.com/wifi.png',
    });
  });

  describe('POST /features', () => {
    it('should return 201 and create feature', async () => {
      const response = await request(app.getHttpServer())
        .post('/features')
        .set('Authorization', 'Bearer fake-jwt-token')
        .send({
          name: 'Parking',
          image: 'https://example.com/parking.png',
        });

      expect(response.status).toBe(201);
    });

    it('should return 400 if name is empty', async () => {
      const response = await request(app.getHttpServer())
        .post('/features')
        .set('Authorization', 'Bearer fake-jwt-token')
        .send({
          name: '',
        });

      expect(response.status).toBe(400);
    });

    it('should return 401 if user is not authenticated', async () => {
      const response = await request(app.getHttpServer())
        .post('/features')
        .send({
          name: 'WiFi',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /features', () => {
    it('should return 200 and all features', async () => {
      const response = await request(app.getHttpServer()).get('/features');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe('WiFi');
    });
  });

  describe('GET /features/:id', () => {
    it('should return 200 and feature by id', async () => {
      const response = await request(app.getHttpServer()).get(
        `/features/${seededFeature.id}`
      );

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('WiFi');
    });

    it('should return 404 if feature not found', async () => {
      const response = await request(app.getHttpServer()).get('/features/999');

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /features/:id', () => {
    it('should return 200 and update feature', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/features/${seededFeature.id}`)
        .set('Authorization', 'Bearer fake-jwt-token')
        .send({
          name: 'Parking',
          image: 'https://example.com/parking.png',
        });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Parking');
    });

    it('should return 400 if name is empty', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/features/${seededFeature.id}`)
        .set('Authorization', 'Bearer fake-jwt-token')
        .send({
          name: '',
        });

      expect(response.status).toBe(400);
    });

    it('should return 404 if feature not found', async () => {
      const response = await request(app.getHttpServer())
        .patch('/features/999')
        .set('Authorization', 'Bearer fake-jwt-token')
        .send({
          name: 'Parking',
        });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /features/:id', () => {
    it('should return 200 and delete feature', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/features/${seededFeature.id}`)
        .set('Authorization', 'Bearer fake-jwt-token');

      expect(response.status).toBe(200);
    });

    it('should return 404 if feature not found', async () => {
      const response = await request(app.getHttpServer())
        .delete('/features/999')
        .set('Authorization', 'Bearer fake-jwt-token');

      expect(response.status).toBe(404);
    });
  });
});
