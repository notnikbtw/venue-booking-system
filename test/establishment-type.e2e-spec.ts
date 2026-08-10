import { JwtAuthGuard } from '@common/guard/jwt-auth.guard';
import { Booking } from '@modules/booking/entities/booking.entity';
import { Establishment } from '@modules/establishment/entities/establishment.entity';
import { EstablishmentType } from '@modules/establishment-type/entities/establishment-type.entity';
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

describe('Establishment Type', () => {
  let app: INestApplication;
  let establishmentRepo: Repository<Establishment>;
  let establishmentTypeRepo: Repository<EstablishmentType>;
  let userRepo: Repository<User>;
  let bookingRepo: Repository<Booking>;

  let seededUser: User;
  let seededEstablishment: Establishment;
  let seededEstablishmentType: EstablishmentType;

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
    establishmentRepo = moduleFixture.get(getRepositoryToken(Establishment));
    bookingRepo = moduleFixture.get(getRepositoryToken(Booking));
    establishmentTypeRepo = moduleFixture.get(
      getRepositoryToken(EstablishmentType)
    );
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await bookingRepo.createQueryBuilder().delete().execute();
    await establishmentRepo.createQueryBuilder().delete().execute();
    await establishmentTypeRepo.createQueryBuilder().delete().execute();
    await userRepo.createQueryBuilder().delete().execute();

    seededUser = await userRepo.save({
      name: 'John Doe',
      email: 'john@example.com',
      password: await bcrypt.hash('Password123', 10),
      phoneNumber: '+380966243761',
      avatarUrl: 'https://example.com/avatar.png',
      role: UserRole.SUPER_ADMIN,
    });

    seededEstablishmentType = await establishmentTypeRepo.save({
      name: 'Restaurant',
      description: 'A nice restaurant',
    });
  });

  describe('POST /establishment-type', () => {
    it('should create establishment type', async () => {
      const response = await request(app.getHttpServer())
        .post('/establishment-type')
        .set('Authorization', 'Bearer fake-jwt-token')
        .send({
          name: 'Restaurant',
          description: 'Restaurant',
        });

      expect(response.statusCode).toBe(201);
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app.getHttpServer())
        .post('/establishment-type')
        .send({
          name: 'Restaurant',
          description: 'A nice restaurant',
        });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /establishment-type', () => {
    it('should return 200 and get all establishment types', async () => {
      const response = await request(app.getHttpServer()).get(
        '/establishment-type'
      );

      expect(response.statusCode).toBe(200);
    });
  });

  describe('GET /establishment-type/:id', () => {
    it('should return 200 and get establishment type by id', async () => {
      const response = await request(app.getHttpServer()).get(
        `/establishment-type/${seededEstablishmentType.id}`
      );

      expect(response.statusCode).toBe(200);
    });

    it('should return 404 if establishment type not found', async () => {
      const response = await request(app.getHttpServer()).get(
        `/establishment-type/${seededEstablishmentType.id + 1}`
      );

      expect(response.statusCode).toBe(404);
    });

    it('should return 400 if id is not valid', async () => {
      const response = await request(app.getHttpServer()).get(
        `/establishment-type/invalid-id`
      );

      expect(response.statusCode).toBe(400);
    });
  });

  describe('PATCH /establishment-type/:id', () => {
    it('should return 200 and update establishment type', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/establishment-type/${seededEstablishmentType.id}`)
        .set('Authorization', 'Bearer fake-jwt-token')
        .send({
          name: 'Updated Restaurant',
          description: 'Updated description',
        });

      expect(response.statusCode).toBe(200);
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/establishment-type/${seededEstablishmentType.id}`)
        .send({
          name: 'Updated Restaurant',
          description: 'Updated description',
        });

      expect(response.statusCode).toBe(401);
    });

    it('should return 404 if establishment type not found', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/establishment-type/999999`)
        .set('Authorization', 'Bearer fake-jwt-token')
        .send({
          name: 'Updated Restaurant',
          description: 'Updated description',
        });

      expect(response.statusCode).toBe(404);
    });

    it('should return 400 if id is not valid', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/establishment-type/invalid-id`)
        .set('Authorization', 'Bearer fake-jwt-token')
        .send({
          name: 'Updated Restaurant',
          description: 'Updated description',
        });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('DELETE /establishment-type/:id', () => {
    it('should return 200 and delete establishment type', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/establishment-type/${seededEstablishmentType.id}`)
        .set('Authorization', 'Bearer fake-jwt-token');

      expect(response.statusCode).toBe(200);
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app.getHttpServer()).delete(
        `/establishment-type/${seededEstablishmentType.id}`
      );

      expect(response.statusCode).toBe(401);
    });

    it('should return 404 if establishment type not found', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/establishment-type/999999`)
        .set('Authorization', 'Bearer fake-jwt-token');

      expect(response.statusCode).toBe(404);
    });

    it('should return 400 if id is not valid', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/establishment-type/invalid-id`)
        .set('Authorization', 'Bearer fake-jwt-token');

      expect(response.statusCode).toBe(400);
    });
  });
});
