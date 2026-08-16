import { JwtAuthGuard } from '@common/guard/jwt-auth.guard';
import { Booking } from '@modules/booking/entities/booking.entity';
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
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { Repository } from 'typeorm';

import { AppModule } from '@/app.module';

describe('Comment system', () => {
  let app: INestApplication;
  let commentRepo: Repository<Comment>;
  let userRepo: Repository<User>;
  let establishmentRepo: Repository<Establishment>;
  let bookingRepo: Repository<Booking>;
  let seededUser: User;
  let seededEstablishment: Establishment;
  let seededComment: Comment;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
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
              entities: [User, Booking, Comment, Establishment],
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

    commentRepo = moduleFixture.get(getRepositoryToken(Comment));
    userRepo = moduleFixture.get(getRepositoryToken(User));
    establishmentRepo = moduleFixture.get(getRepositoryToken(Establishment));
    bookingRepo = moduleFixture.get(getRepositoryToken(Booking));
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await bookingRepo.createQueryBuilder().delete().execute();
    await commentRepo.createQueryBuilder().delete().execute();
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
      name: 'Restaurant',
      address: '123 Main St',
      description: 'A nice restaurant',
      totalSeats: 50,
      owner: seededUser,
    });

    const commentAuthor = await userRepo.save({
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: await bcrypt.hash('Password123', 10),
      phoneNumber: '+380966243762',
      avatarUrl: 'https://example.com/avatar2.png',
      role: UserRole.USER,
    });

    seededComment = await commentRepo.save({
      text: 'Comment',
      rating: 4,
      user: commentAuthor,
      establishment: seededEstablishment,
    });
  });

  describe('POST /comment', () => {
    it('should return 201 on successful create comment', async () => {
      const response = await request(app.getHttpServer())
        .post('/comment')
        .set('Authorization', 'Bearer fake-jwt-token')
        .send({
          text: 'Comment',
          rating: 4,
          establishmentId: seededEstablishment.id,
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
          establishmentId: seededEstablishment.id,
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
          establishmentId: seededEstablishment.id,
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
        `/comment/establishment/${seededEstablishment.id}`
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
    it('should return 200 on successful edit comment', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/comment/${seededComment.id}`)
        .set('Authorization', 'Bearer fake-jwt-token')
        .send({
          text: 'Edited comment',
          rating: 5,
        });

      expect(response.statusCode).toBe(200);
    });

    it('should return 401 if user is not authenticated', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/comment/${seededComment.id}`)
        .send({
          text: 'Edited comment',
          rating: 5,
        });

      expect(response.statusCode).toBe(401);
      expect(response.body.message).toBe('Unauthorized');
    });

    it('should return 404 if comment not found', async () => {
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
        .delete(`/comment/${seededComment.id}`)
        .set('Authorization', 'Bearer fake-jwt-token');

      expect(response.statusCode).toBe(200);
    });

    it('should return 401 if user is not authenticated', async () => {
      const response = await request(app.getHttpServer()).delete(
        `/comment/${seededComment.id}`
      );

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
