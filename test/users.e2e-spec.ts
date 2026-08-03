import { JwtAuthGuard } from '@common/guard/jwt-auth.guard';
import { User, UserRole } from '@modules/users/entities/user.entity';
import {
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';

import { AppModule } from '@/app.module';

describe('Users', () => {
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

          request.user = { id: 1, role: UserRole.SUPER_ADMIN };
          return true;
        },
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
        findOne: jest.fn().mockImplementation(options => {
          if (options?.where?.id === 1) {
            return Promise.resolve({
              id: 1,
              name: 'John Doe',
              bookings: [],
              comments: [],
            });
          }

          return Promise.resolve(null);
        }),
        findOneBy: jest.fn().mockImplementation(options => {
          if (options?.id === 1) {
            return Promise.resolve({
              id: 1,
              name: 'John Doe',
              bookings: [],
              comments: [],
            });
          }

          return Promise.resolve(null);
        }),
        merge: jest.fn().mockImplementation((user, dto) => {
          Object.assign(user, dto);
          return user;
        }),
        save: jest.fn().mockImplementation(user => {
          return Promise.resolve(user);
        }),
        delete: jest.fn().mockImplementation(() => {
          return Promise.resolve();
        }),
        createQueryBuilder: jest.fn().mockImplementation(() => {
          const queryBuilderMock = {
            select: jest.fn().mockReturnThis(),
            addSelect: jest.fn().mockReturnThis(),
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            leftJoin: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            take: jest.fn().mockReturnThis(),
            offset: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            clone: jest.fn().mockImplementation(() => queryBuilderMock),
            getRawAndEntities: jest.fn().mockResolvedValue({
              entities: [
                {
                  id: 1,
                  name: 'John Doe',
                  bookings: [],
                  comments: [],
                },
              ],
              raw: [],
            }),
            getMany: jest.fn().mockResolvedValue([
              {
                id: 1,
                name: 'John Doe',
                bookings: [],
                comments: [],
              },
            ]),
            getManyAndCount: jest.fn().mockResolvedValue([
              {
                id: 1,
                name: 'John Doe',
                bookings: [],
                comments: [],
              },
            ]),
            getCount: jest.fn().mockResolvedValue(1),
          };
          return queryBuilderMock;
        }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('GET /users/me', () => {
    it('should return 200 and current user', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', 'Bearer fake-jwt-token');

      expect(response.statusCode).toBe(200);
      expect(response.body).toMatchObject({
        id: 1,
        name: 'John Doe',
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
        id: 1,
        name: 'Updated User Name',
      });
    });

    it('should return 404 when user is not found', async () => {
      const userRepo = app.get(getRepositoryToken(User));
      jest.spyOn(userRepo, 'findOneBy').mockResolvedValueOnce(null);

      const response = await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', 'Bearer fake-jwt-token')
        .send({
          name: 'Updated User Name',
        });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PATCH /users/:id', () => {
    it('should return 200 and update user', async () => {
      const response = await request(app.getHttpServer())
        .patch('/users/1')
        .set('Authorization', 'Bearer fake-jwt-token')
        .send({
          name: 'New User Name',
        });

      expect(response.statusCode).toBe(200);
      expect(response.body).toMatchObject({
        id: 1,
        name: 'New User Name',
      });
    });
    it('should return 401 if no auth token', async () => {
      const response = await request(app.getHttpServer()).patch('/users/1');

      expect(response.statusCode).toBe(401);
    });

    it('should return 404 when user is not found', async () => {
      const userRepo = app.get(getRepositoryToken(User));
      jest.spyOn(userRepo, 'findOneBy').mockResolvedValueOnce(null);
      const response = await request(app.getHttpServer())
        .patch('/users/1')
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
            id: 1,
            name: 'John Doe',
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
        .get('/users?page=2&take=10&order=DESC&search=John')
        .set('Authorization', 'Bearer fake-jwt-token');

      expect(response.statusCode).toBe(200);
      expect(response.body).toMatchObject({
        data: [
          {
            id: 1,
            name: 'John Doe',
          },
        ],
        meta: {
          page: 2,
          take: 10,
          itemCount: 1,
          pageCount: 1,
          hasPreviousPage: true,
          hasNextPage: false,
        },
      });
    });
  });

  describe('GET /users/:id', () => {
    it('should return 200 and user by id', async () => {
      const response = await request(app.getHttpServer()).get('/users/1');

      expect(response.statusCode).toBe(200);
      expect(response.body).toMatchObject({
        id: 1,
        name: 'John Doe',
      });
    });
    it('should return 404 when user is not found', async () => {
      const response = await request(app.getHttpServer()).get('/users/999');

      expect(response.statusCode).toBe(404);
    });
  });

  describe('DELETE /users/:id', () => {
    it('should return 200 and delete user', async () => {
      const response = await request(app.getHttpServer())
        .delete('/users/1')
        .set('Authorization', 'Bearer fake-jwt-token');

      expect(response.statusCode).toBe(200);
    });
    it('should return 401 if no auth token', async () => {
      const response = await request(app.getHttpServer()).delete('/users/1');

      expect(response.statusCode).toBe(401);
    });

    it('should return 404 when user is not found', async () => {
      const userRepo = app.get(getRepositoryToken(User));
      jest.spyOn(userRepo, 'findOneBy').mockResolvedValueOnce(null);
      const response = await request(app.getHttpServer())
        .delete('/users/1')
        .set('Authorization', 'Bearer fake-jwt-token');

      expect(response.statusCode).toBe(404);
    });
  });
});
