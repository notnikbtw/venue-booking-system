import { JwtAuthGuard } from '@common/guard/jwt-auth.guard';
import { Booking } from '@modules/booking/entities/booking.entity';
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

describe('Users', () => {
  let app: INestApplication;
  let userRepo: Repository<User>;
  let bookingRepo: Repository<Booking>;
  let seededUser: User;

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
              entities: [User, Booking],
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
    bookingRepo = moduleFixture.get(getRepositoryToken(Booking));
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await bookingRepo.createQueryBuilder().delete().execute();
    await userRepo.createQueryBuilder().delete().execute();

    seededUser = await userRepo.save({
      name: 'John Doe',
      email: 'john@example.com',
      password: await bcrypt.hash('Password123', 10),
      phoneNumber: '+380966243761',
      avatarUrl: 'https://example.com/avatar.png',
      role: UserRole.SUPER_ADMIN,
    });
  });

  describe('GET /users/me', () => {
    it('should return 200 and current user', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', 'Bearer fake-jwt-token');

      expect(response.statusCode).toBe(200);
      expect(response.body).toMatchObject({
        id: seededUser.id,
        name: seededUser.name,
      });
    });

    it('should return 401 if no auth token', async () => {
      const response = await request(app.getHttpServer()).get('/users/me');

      expect(response.statusCode).toBe(401);
    });
  });

  describe('PATCH /users/me', () => {
    it('should return 200 and update user', async () => {
      const response = await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', 'Bearer fake-jwt-token')
        .send({
          name: 'Updated User Name',
        });

      expect(response.statusCode).toBe(200);
      expect(response.body).toMatchObject({
        id: seededUser.id,
        name: 'Updated User Name',
      });
    });

    it('should return 404 when user is not found', async () => {
      const response = await request(app.getHttpServer())
        .patch('/users/999999')
        .set('Authorization', 'Bearer fake-jwt-token')
        .send({ name: 'Updated User Name' });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PATCH /users/:id', () => {
    it('should return 200 and update user', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/users/${seededUser.id}`)
        .set('Authorization', 'Bearer fake-jwt-token')
        .send({
          name: 'New User Name',
        });

      expect(response.statusCode).toBe(200);
      expect(response.body).toMatchObject({
        id: seededUser.id,
        name: 'New User Name',
      });
    });
    it('should return 401 if no auth token', async () => {
      const response = await request(app.getHttpServer()).patch('/users/1');

      expect(response.statusCode).toBe(401);
    });

    it('should return 404 when user is not found', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/users/999999`)
        .set('Authorization', 'Bearer fake-jwt-token');

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /users', () => {
    it('should return 200 and all users', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', 'Bearer fake-jwt-token');

      expect(response.statusCode).toBe(200);
      expect(response.body).toMatchObject({
        data: [
          {
            id: seededUser.id,
            name: seededUser.name,
          },
        ],
        meta: {
          page: 1,
          take: 10,
          itemCount: 1,
          pageCount: 1,
          hasPreviousPage: false,
          hasNextPage: false,
        },
      });
    });

    it('should return 401 if no auth token', async () => {
      const response = await request(app.getHttpServer()).get('/users');

      expect(response.statusCode).toBe(401);
    });

    it('should return 200 with pagination query params', async () => {
      const response = await request(app.getHttpServer())
        .get('/users?page=1&take=10&order=DESC&search=John')
        .set('Authorization', 'Bearer fake-jwt-token');

      expect(response.statusCode).toBe(200);
      expect(response.body).toMatchObject({
        data: [
          {
            id: seededUser.id,
            name: seededUser.name,
          },
        ],
        meta: {
          page: 1,
          take: 10,
          itemCount: 1,
          pageCount: 1,
          hasPreviousPage: false,
          hasNextPage: false,
        },
      });
    });
  });

  describe('GET /users/:id', () => {
    it('should return 200 and user by id', async () => {
      const response = await request(app.getHttpServer()).get(
        `/users/${seededUser.id}`
      );

      expect(response.statusCode).toBe(200);
      expect(response.body).toMatchObject({
        id: seededUser.id,
        name: seededUser.name,
      });
    });
    it('should return 404 when user is not found', async () => {
      const response = await request(app.getHttpServer()).get('/users/999999');

      expect(response.statusCode).toBe(404);
    });
  });

  describe('DELETE /users/:id', () => {
    it('should return 200 and delete user', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/users/${seededUser.id}`)
        .set('Authorization', 'Bearer fake-jwt-token');

      expect(response.statusCode).toBe(200);
    });
    it('should return 401 if no auth token', async () => {
      const response = await request(app.getHttpServer()).delete('/users/1');

      expect(response.statusCode).toBe(401);
    });

    it('should return 404 when user is not found', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/users/999999`)
        .set('Authorization', 'Bearer fake-jwt-token');

      expect(response.statusCode).toBe(404);
    });
  });
});
