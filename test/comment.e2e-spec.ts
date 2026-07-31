import { JwtAuthGuard } from '@common/guard/jwt-auth.guard';
import { Comment } from '@modules/comment/entities/comment.entity';
import { Establishment } from '@modules/establishment/entities/establishment.entity';
import { User, UserRole } from '@modules/users/entities/user.entity';
import {
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';

import { AppModule } from '@/app.module';

describe('Comment system', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
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

          request.user = { id: 1, role: UserRole.OWNER };
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
      .overrideProvider(getRepositoryToken(Comment))
      .useValue({
        findOne: jest.fn().mockImplementation(options => {
          const id = options?.id ?? options?.where?.id;

          if (id === 1) {
            return Promise.resolve({
              id: 1,
              text: 'Great experience!',
              rating: 4,
              createdAt: new Date('2026-07-20T10:00:00.000Z'),
              user: { id: 1, name: 'User1' },
              establishment: { id: 1, ownerId: 1 },
            });
          }
        }),
        create: jest.fn().mockImplementation(dto => dto),
        merge: jest.fn().mockImplementation((entity, dto) => {
          Object.assign(entity, dto);
          return entity;
        }),
        save: jest.fn().mockImplementation(dto => Promise.resolve(dto)),
        delete: jest.fn().mockResolvedValue({ affected: 1 }),
        createQueryBuilder: jest.fn().mockReturnValue({
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          skip: jest.fn().mockReturnThis(),
          take: jest.fn().mockReturnThis(),
          getCount: jest.fn().mockResolvedValue(1),
          getRawAndEntities: jest.fn().mockResolvedValue({
            entities: [
              {
                id: 1,
                text: 'Great experience!',
                rating: 5,
                createdAt: '2026-07-20T10:00:00.000Z',
                user: { id: 1, name: 'User' },
              },
            ],
            raw: [],
          }),
        }),
      })
      .overrideProvider(getRepositoryToken(Establishment))
      .useValue({
        findOneBy: jest.fn().mockImplementation(options => {
          const id = options?.id ?? options?.where?.id;

          if (id === 1) {
            return Promise.resolve({
              id: 1,
              name: 'Restaurant',
              address: 'New York, Street 123',
              ownerId: 2,
              owner: {
                name: 'User2',
                id: 2,
              },
              comments: [],
            });
          }
        }),
        findOne: jest.fn().mockImplementation(options => {
          const id = options?.where?.id ?? options?.id;

          if (id === 1) {
            return Promise.resolve({
              id: 1,
              name: 'Restaurant',
              address: 'New York, Street 123',
              ownerId: 2,
              owner: {
                name: 'User2',
                id: 2,
              },
              comments: [],
            });
          }
        }),
        save: jest.fn().mockImplementation(dto =>
          Promise.resolve({
            id: 1,
            ...dto,
          })
        ),
      })
      .overrideProvider(getRepositoryToken(User))
      .useValue({
        findOneBy: jest.fn().mockImplementation(options => {
          const id = options?.id ?? options?.where?.id;

          if (id === 1) {
            return Promise.resolve({
              id: 1,
              name: 'User',
              role: UserRole.USER,
              favorites: [1],
            });
          }

          if (id === 2) {
            return Promise.resolve({
              id: 2,
              name: 'User2',
              role: UserRole.OWNER,
              favorites: [1],
            });
          }
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

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('POST /comment', () => {
    it('should return 201 on successful create comment', async () => {
      const response = await request(app.getHttpServer())
        .post('/comment')
        .set('Authorization', 'Bearer fake-jwt-token')
        .send({
          text: 'Comment',
          rating: 4,
          establishmentId: 1,
        });

      expect(response.statusCode).toBe(201);
    });

    it('should return 404 when establishment not found', async () => {
      const response = await request(app.getHttpServer())
        .post('/comment')
        .set('Authorization', 'Bearer fake-jwt-token')
        .send({
          text: 'Comment',
          rating: 4,
          establishmentId: 999,
        });

      expect(response.statusCode).toBe(404);
      expect(response.body.message).toBe('Establishment 999 not found');
    });

    it('should return 401 if user is not authenticated', async () => {
      const response = await request(app.getHttpServer())
        .post('/comment')
        .send({
          text: 'Comment',
          rating: 4,
          establishmentId: 1,
        });

      expect(response.statusCode).toBe(401);
      expect(response.body.message).toBe('Unauthorized');
    });

    it('should return 400 if rating is not in range', async () => {
      const response = await request(app.getHttpServer())
        .post('/comment')
        .set('Authorization', 'Bearer fake-jwt-token')
        .send({
          text: 'Comment',
          rating: 6,
          establishmentId: 1,
        });

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toEqual([
        'rating must not be greater than 5',
      ]);
    });
  });

  describe('GET /comment/establishment/:id', () => {
    it('should return 200 on successful get comments', async () => {
      const response = await request(app.getHttpServer()).get(
        '/comment/establishment/1'
      );

      expect(response.statusCode).toBe(200);
    });

    it('should return 404 when establishment not found', async () => {
      const response = await request(app.getHttpServer()).get(
        '/comment/establishment/999'
      );

      expect(response.statusCode).toBe(404);
      expect(response.body.message).toBe('Establishment 999 not found');
    });
  });

  describe('PATCH /comment/:id', () => {
    it('should retutn 200 on successful edit comment', async () => {
      const response = await request(app.getHttpServer())
        .patch('/comment/1')
        .set('Authorization', 'Bearer fake-jwt-token')
        .send({
          text: 'Edited comment',
          rating: 5,
        });

      expect(response.statusCode).toBe(200);
    });

    it('shoult return 401 if user is not authenticated', async () => {
      const response = await request(app.getHttpServer())
        .patch('/comment/1')
        .send({
          text: 'Edited comment',
          rating: 5,
        });

      expect(response.statusCode).toBe(401);
      expect(response.body.message).toBe('Unauthorized');
    });

    it('shoult return 404 if comment not found', async () => {
      const response = await request(app.getHttpServer())
        .patch('/comment/999')
        .set('Authorization', 'Bearer fake-jwt-token')
        .send({
          text: 'Edited comment',
          rating: 5,
        });

      expect(response.statusCode).toBe(404);
      expect(response.body.message).toBe('Comment 999 invalid');
    });
  });

  describe('DELETE /comment/:id', () => {
    it('should return 200 on successful delete comment', async () => {
      const response = await request(app.getHttpServer())
        .delete('/comment/1')
        .set('Authorization', 'Bearer fake-jwt-token');

      expect(response.statusCode).toBe(200);
    });

    it('should return 401 if user is not authenticated', async () => {
      const response = await request(app.getHttpServer()).delete('/comment/1');

      expect(response.statusCode).toBe(401);
      expect(response.body.message).toBe('Unauthorized');
    });

    it('should return 404 if comment not found', async () => {
      const response = await request(app.getHttpServer())
        .delete('/comment/999')
        .set('Authorization', 'Bearer fake-jwt-token');

      expect(response.statusCode).toBe(404);
      expect(response.body.message).toBe('Comment 999 not found');
    });
  });
});
