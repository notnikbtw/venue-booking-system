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
import { JwtAuthGuard } from '@/common/guard/jwt-auth.guard';
import { RefreshToken } from '@/modules/auth/entities/refresh-token.entity';

describe('Auth', () => {
  let app: INestApplication;
  let userRepo: Repository<User>;
  let refreshTokenRepo: Repository<RefreshToken>;
  let bookingRepo: Repository<Booking>;
  let seededUser: User;

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
              entities: [User, RefreshToken, Booking, Comment],
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
    refreshTokenRepo = moduleFixture.get(getRepositoryToken(RefreshToken));
    bookingRepo = moduleFixture.get(getRepositoryToken(Booking));
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await bookingRepo.createQueryBuilder().delete().execute();
    await refreshTokenRepo.createQueryBuilder().delete().execute();
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

  describe('POST /auth/register', () => {
    it('should return 201 on successful register', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'User',
          email: 'test@example.com',
          password: 'Password123',
          phoneNumber: '+380966243760',
        });

      expect(response.statusCode).toBe(201);
    });

    it('should return 400 if data is invalid', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'User',
          email: 'john@example.com',
          password: 'Password123',
          phoneNumber: '123',
        });

      expect(response.statusCode).toBe(400);
    });

    it('should return 409 if email already exists', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'User',
          email: 'john@example.com',
          password: 'Password123',
          phoneNumber: '+380966243760',
        });

      expect(response.statusCode).toBe(409);
    });

    it('should return 409 if phone number already exists', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'User',
          email: 'test@example.com',
          password: 'Password123',
          phoneNumber: '+380966243761',
        });

      expect(response.statusCode).toBe(409);
    });
  });

  describe('POST /auth/login', () => {
    it('should return 201 on successful login', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'john@example.com',
          password: 'Password123',
        });

      expect(response.statusCode).toBe(201);
    });

    it('should return 400 if data is invalid', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'john@example.com',
          password: '123',
        });

      expect(response.statusCode).toBe(400);
    });

    it('should return 401 if user does not exist', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'notfound@example.com',
          password: 'Password123',
        });

      expect(response.statusCode).toBe(401);
    });

    it('should return 401 if password is wrong', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'john@example.com',
          password: 'wrong password',
        });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should return 201 on successful refresh', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'john@example.com',
          password: 'Password123',
        });

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: loginRes.body.refreshToken,
        });

      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });

    it('should return 401 if refresh token is invalid', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: 'invalid-token',
        });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('PATCH /auth/:id/role', () => {
    it('should return 200 on successful role update', async () => {
      const mockUser = await userRepo.save({
        name: 'User',
        email: 'user@example.com',
        password: await bcrypt.hash('Password123', 10),
        phoneNumber: '+111111111111',
        avatarUrl: 'https://example.com/avatar.png',
        role: UserRole.USER,
      });

      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'john@example.com',
          password: 'Password123',
        });

      const response = await request(app.getHttpServer())
        .patch(`/auth/${mockUser.id}/role`)
        .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
        .send({
          role: UserRole.MODERATOR,
        });

      expect(response.statusCode).toBe(200);
    });

    it('should return 400 if role is invalid', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'john@example.com', password: 'Password 123' });

      const response = await request(app.getHttpServer())
        .patch('/auth/1/role')
        .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
        .send({ role: 'invalid' });

      expect(response.statusCode).toBe(400);
    });

    it('should return 404 if user does not exist', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'john@example.com', password: 'Password123' });

      const response = await request(app.getHttpServer())
        .patch('/auth/999/role')
        .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
        .send({ role: UserRole.MODERATOR });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /auth/logout', () => {
    it('should return 201 on successful logout', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'john@example.com',
          password: 'Password123',
        });

      const response = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${loginRes.body.accessToken}`);

      expect(response.statusCode).toBe(201);
    });

    it('should return 401 if token is invalid', async () => {
      const response = await request(app.getHttpServer()).post('/auth/logout');

      expect(response.statusCode).toBe(401);
    });
  });
});
