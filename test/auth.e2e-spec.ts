import { User, UserRole } from '@modules/users/entities/user.entity';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import request from 'supertest';

import { AppModule } from '@/app.module';
import { RefreshToken } from '@/modules/auth/entities/refresh-token.entity';

describe('Auth', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ConfigService)
      .useValue({
        get: jest.fn().mockImplementation((key: string) => {
          if (key === 'database') {
            return {
              type: 'better-sqlite3',
              database: ':memory:',
              entities: [],
              synchronize: true,
            };
          }
          return 'some-value';
        }),
        getOrThrow: jest.fn().mockImplementation((key: string) => {
          return 'some-value';
        }),
      })
      .overrideProvider(getRepositoryToken(User))
      .useValue({
        findOne: jest.fn().mockImplementation((options?: any) => {
          if (options?.where?.email === 'test1@example.com') {
            return Promise.resolve({
              id: 1,
              name: 'User1',
              email: 'test1@example.com',
              password: bcrypt.hashSync('Password123', 10),
              role: UserRole.USER,
              phoneNumber: '+380966243761',
            });
          }
          return Promise.resolve(null);
        }),
        create: jest.fn().mockImplementation(dto => dto),
        save: jest
          .fn()
          .mockImplementation(dto => Promise.resolve({ id: 1, ...dto })),
      })
      .overrideProvider(getRepositoryToken(RefreshToken))
      .useValue({
        delete: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(dto => dto),
        save: jest.fn().mockImplementation(dto => Promise.resolve(dto)),
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
    it('should return 400 on invalid data', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'User',
          email: 'test',
          password: 'Password123',
          phoneNumber: '+3809662437',
        });

      expect(response.statusCode).toBe(400);
    });
    it('should return 409 on already existing user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'User1',
          email: 'test1@example.com',
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
          email: 'test1@example.com',
          password: 'Password123',
        });

      expect(response.statusCode).toBe(201);
    });
    it('should return 401 on invalid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test1@example.com',
          password: 'wrongPassword',
        });

      expect(response.statusCode).toBe(401);
    });
    it('should return 404 on not found user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'non_existent@example.com',
          password: 'Password123',
        });

      expect(response.statusCode).toBe(401);
    });
  });
});
