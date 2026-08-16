import { JwtAuthGuard } from '@common/guard/jwt-auth.guard';
import { RolesGuard } from '@common/guard/jwt-roles.guard';
import { FileUploadService } from '@common/services/file-upload.service';
import { GeocodingService } from '@common/services/geocoding.service';
import { Booking } from '@modules/booking/entities/booking.entity';
import { Comment } from '@modules/comment/entities/comment.entity';
import { Establishment } from '@modules/establishment/entities/establishment.entity';
import { EstablishmentType } from '@modules/establishment-type/entities/establishment-type.entity';
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

describe('Establishment System', () => {
  let app: INestApplication;
  let userRepo: Repository<User>;
  let establishmentRepo: Repository<Establishment>;
  let featureRepo: Repository<Feature>;
  let typeRepo: Repository<EstablishmentType>;
  let bookingRepo: Repository<Booking>;
  let commentRepo: Repository<Comment>;
  let seededUser: User;
  let otherUser: User;
  let moderatorUser: User;
  let regularUser: User;
  let seededType: EstablishmentType;
  let seededFeature: Feature;
  let seededFeature2: Feature;
  let seededEstablishment: Establishment;
  let otherEstablishment: Establishment;

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
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideProvider(ConfigService)
      .useValue({
        get: (key: string) => {
          if (key === 'database') {
            return {
              type: 'better-sqlite3',
              database: ':memory:',
              entities: [
                User,
                Establishment,
                Feature,
                EstablishmentType,
                Booking,
                Comment,
              ],
              synchronize: true,
            };
          }
          if (key === 'MINIMUM_COMMENTS') return 5;
          if (key === 'GLOBAL_AVERAGE_RATING') return 4.5;
          if (key === 'UPLOADS_ESTABLISHMENTS_PATH') return 'uploads/test';
          return 'some-value';
        },
        getOrThrow: (key: string) => {
          if (key === 'MINIMUM_COMMENTS') return 5;
          if (key === 'GLOBAL_AVERAGE_RATING') return 4.5;
          if (key === 'UPLOADS_ESTABLISHMENTS_PATH') return 'uploads/test';
          return 'some-value';
        },
      })
      .overrideProvider(FileUploadService)
      .useValue({
        uploadFile: jest.fn().mockResolvedValue('https://placehold.co/600x400'),
        getFileUrl: jest.fn().mockReturnValue('https://placehold.co/600x400'),
      })
      .overrideProvider(GeocodingService)
      .useValue({
        geocode: jest.fn().mockResolvedValue({ lat: 45.123, lng: 14.456 }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    userRepo = moduleFixture.get(getRepositoryToken(User));
    establishmentRepo = moduleFixture.get(getRepositoryToken(Establishment));
    featureRepo = moduleFixture.get(getRepositoryToken(Feature));
    typeRepo = moduleFixture.get(getRepositoryToken(EstablishmentType));
    bookingRepo = moduleFixture.get(getRepositoryToken(Booking));
    commentRepo = moduleFixture.get(getRepositoryToken(Comment));
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await bookingRepo.createQueryBuilder().delete().execute();
    await commentRepo.createQueryBuilder().delete().execute();
    await establishmentRepo.createQueryBuilder().delete().execute();
    await userRepo.createQueryBuilder().delete().execute();
    await featureRepo.createQueryBuilder().delete().execute();
    await typeRepo.createQueryBuilder().delete().execute();

    seededUser = await userRepo.save({
      name: 'John Doe',
      email: 'john@example.com',
      password: await bcrypt.hash('Password123', 10),
      phoneNumber: '+380966243761',
      avatarUrl: 'https://example.com/avatar.png',
      role: UserRole.SUPER_ADMIN,
    });

    otherUser = await userRepo.save({
      name: 'Other User',
      email: 'other@example.com',
      password: await bcrypt.hash('Password123', 10),
      phoneNumber: '+380966243762',
      avatarUrl: 'https://example.com/avatar2.png',
      role: UserRole.OWNER,
    });

    moderatorUser = await userRepo.save({
      name: 'Moderator User',
      email: 'mod@example.com',
      password: await bcrypt.hash('Password123', 10),
      phoneNumber: '+380966243763',
      avatarUrl: 'https://example.com/avatar3.png',
      role: UserRole.MODERATOR,
    });

    regularUser = await userRepo.save({
      name: 'Regular User',
      email: 'regular@example.com',
      password: await bcrypt.hash('Password123', 10),
      phoneNumber: '+380966243764',
      avatarUrl: 'https://example.com/avatar4.png',
      role: UserRole.USER,
    });

    seededType = await typeRepo.save({
      name: 'Restaurant',
    });

    seededFeature = await featureRepo.save({
      name: 'WiFi',
    });

    seededFeature2 = await featureRepo.save({
      name: 'Parking',
    });

    seededEstablishment = await establishmentRepo.save({
      name: 'Restaurant',
      address: '123 Street, New York, 00501',
      locationDetails: {
        city: 'New York',
        street: 'Street',
        building: '123',
        zipCode: '00501',
      },
      description: 'Calm and comfortable establishment',
      totalSeats: 50,
      coverPhoto: 'https://placehold.co/600x400',
      photos: ['https://placehold.co/600x400', 'https://placehold.co/600x400'],
      owner: seededUser,
      type: seededType,
      features: [seededFeature],
    });

    otherEstablishment = await establishmentRepo.save({
      name: 'Other Place',
      address: '456 Street, New York, 00501',
      locationDetails: {
        city: 'New York',
        street: 'Street',
        building: '456',
        zipCode: '00501',
      },
      description: 'Another establishment',
      totalSeats: 30,
      owner: otherUser,
      type: seededType,
      features: [],
    });

    await commentRepo.save({
      text: 'Great experience!',
      rating: 5,
      user: regularUser,
      establishment: seededEstablishment,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('POST /establishment', () => {
    it('should return 201 on successful create establishment', async () => {
      const fakeFile = Buffer.from('fake-image-content');

      const response = await request(app.getHttpServer())
        .post('/establishment')
        .set('Authorization', 'Bearer fake-jwt-token')
        .field('name', 'Restaurant')
        .field('city', 'New York')
        .field('street', 'Street')
        .field('building', '123')
        .field('zipCode', '00501')
        .field('description', 'Calm and comfortable establishment')
        .field('totalSeats', 50)
        .field('featureIds[]', seededFeature.id)
        .field('typeId', seededType.id)
        .attach('coverPhoto', fakeFile, 'cover.jpg')
        .attach('photos', fakeFile, 'photo1.jpg')
        .attach('photos', fakeFile, 'photo2.jpg');

      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Restaurant');
    });

    it('should return 400 if validation fails', async () => {
      const response = await request(app.getHttpServer())
        .post('/establishment')
        .set('Authorization', 'Bearer fake-jwt-token')
        .field('name', 'Restaurant')
        .field('city', 'New York')
        .field('totalSeats', '-23');

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(Array.isArray(response.body.message)).toBe(true);
    });

    it('should return 401 if user is not authorized', async () => {
      const response = await request(app.getHttpServer()).post(
        '/establishment'
      );

      expect(response.statusCode).toBe(401);
      expect(response.body).toHaveProperty('message', 'Unauthorized');
    });
  });

  describe('GET /establishment', () => {
    it('should return all establishments', async () => {
      const response = await request(app.getHttpServer())
        .get('/establishment')
        .query({
          page: 1,
          take: 10,
          search: '',
        });

      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      const establishment = response.body.data.find(
        (e: any) => e.id === seededEstablishment.id
      );
      expect(establishment).toBeDefined();
      expect(establishment.name).toBe('Restaurant');
    });
  });

  describe('GET /establishment/:id', () => {
    it('should return establishment by id', async () => {
      const response = await request(app.getHttpServer()).get(
        `/establishment/${seededEstablishment.id}`
      );

      expect(response.statusCode).toBe(200);
      expect(response.body.id).toBe(seededEstablishment.id);
      expect(response.body.name).toBe('Restaurant');
    });

    it('should return 404 if establishment not found', async () => {
      const response = await request(app.getHttpServer()).get(
        '/establishment/999999'
      );

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /establishment/me', () => {
    it('should return current owner establishments', async () => {
      const response = await request(app.getHttpServer())
        .get('/establishment/me')
        .set('Authorization', 'Bearer fake-jwt-token');

      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      const establishment = response.body.find(
        (e: any) => e.id === seededEstablishment.id
      );
      expect(establishment).toBeDefined();
    });

    it('should return 401 if user is not authorized', async () => {
      const response = await request(app.getHttpServer()).get(
        '/establishment/me'
      );

      expect(response.statusCode).toBe(401);
      expect(response.body).toHaveProperty('message', 'Unauthorized');
    });
  });

  describe('GET /establishment/:id/comments', () => {
    it('should return all comments from establishment', async () => {
      const response = await request(app.getHttpServer()).get(
        `/establishment/${seededEstablishment.id}/comments`
      );

      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0].text).toBe('Great experience!');
    });

    it('should return 404 if establishment not found', async () => {
      const response = await request(app.getHttpServer()).get(
        '/establishment/999999/comments'
      );

      expect(response.statusCode).toBe(404);
    });

    it('should handle invalid string id properly', async () => {
      const response = await request(app.getHttpServer()).get(
        '/establishment/asdfsdf/comments'
      );

      expect([400, 404]).toContain(response.statusCode);
    });
  });

  describe('PATCH /establishment/:id', () => {
    it('should return 200 on successful establishment update', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/establishment/${seededEstablishment.id}`)
        .set('Authorization', 'Bearer fake-jwt-token')
        .field('name', 'Cafe')
        .field('city', 'Miami')
        .field('street', 'Street')
        .field('building', '987')
        .field('zipCode', '33129')
        .field('totalSeats', 15);

      expect(response.statusCode).toBe(200);
      expect(response.body.id).toBe(seededEstablishment.id);
      expect(response.body.name).toBe('Cafe');
    });

    it('should update establishment cover photo if uploaded', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/establishment/${seededEstablishment.id}`)
        .set('Authorization', 'Bearer fake-jwt-token')
        .attach('coverPhoto', Buffer.from('fake image content'), 'cover.jpg');

      expect(response.statusCode).toBe(200);
      expect(response.body.coverPhoto).toBeDefined();
    });

    it('should return 401 if no authorization header provided', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/establishment/${seededEstablishment.id}`)
        .field('name', 'New Name');

      expect(response.statusCode).toBe(401);
      expect(response.body).toHaveProperty('message', 'Unauthorized');
    });

    it('should return 404 if establishment does not exist', async () => {
      const response = await request(app.getHttpServer())
        .patch('/establishment/999999')
        .set('Authorization', 'Bearer fake-jwt-token')
        .field('name', 'New Name');

      expect(response.statusCode).toBe(404);
    });
  });

  describe('DELETE /establishment/:id', () => {
    it('should return 200 on successful delete', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/establishment/${seededEstablishment.id}`)
        .set('Authorization', 'Bearer fake-jwt-token');

      expect(response.statusCode).toBe(200);
    });

    it('should return 401 if no authorization header provided', async () => {
      const response = await request(app.getHttpServer()).delete(
        `/establishment/${seededEstablishment.id}`
      );

      expect(response.statusCode).toBe(401);
      expect(response.body).toHaveProperty('message', 'Unauthorized');
    });

    it('should return 404 if establishment does not exist', async () => {
      const response = await request(app.getHttpServer())
        .delete('/establishment/999999')
        .set('Authorization', 'Bearer fake-jwt-token');

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /establishment/:id/features/:featureId', () => {
    it('should return 201 on successful feature attachment', async () => {
      const response = await request(app.getHttpServer())
        .post(
          `/establishment/${seededEstablishment.id}/features/${seededFeature2.id}`
        )
        .set('Authorization', 'Bearer fake-jwt-token');

      expect(response.statusCode).toBe(201);
    });

    it('should return 400 if feature already added', async () => {
      const response = await request(app.getHttpServer())
        .post(
          `/establishment/${seededEstablishment.id}/features/${seededFeature.id}`
        )
        .set('Authorization', 'Bearer fake-jwt-token');

      expect(response.statusCode).toBe(400);
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app.getHttpServer()).post(
        `/establishment/${seededEstablishment.id}/features/${seededFeature.id}`
      );

      expect(response.statusCode).toBe(401);
      expect(response.body).toHaveProperty('message', 'Unauthorized');
    });

    it('should return 404 if feature not found', async () => {
      const response = await request(app.getHttpServer())
        .post(`/establishment/${seededEstablishment.id}/features/999999`)
        .set('Authorization', 'Bearer fake-jwt-token');

      expect(response.statusCode).toBe(404);
    });
  });

  describe('DELETE /establishment/:id/features/:featureId', () => {
    it('should return 200 on successful feature detachment', async () => {
      const response = await request(app.getHttpServer())
        .delete(
          `/establishment/${seededEstablishment.id}/features/${seededFeature.id}`
        )
        .set('Authorization', 'Bearer fake-jwt-token');

      expect(response.statusCode).toBe(200);
    });

    it('should return 404 if feature is not attached to establishment', async () => {
      const response = await request(app.getHttpServer())
        .delete(
          `/establishment/${seededEstablishment.id}/features/${seededFeature2.id}`
        )
        .set('Authorization', 'Bearer fake-jwt-token');

      expect(response.statusCode).toBe(404);
    });

    it('should return 404 if establishment not found', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/establishment/999999/features/${seededFeature.id}`)
        .set('Authorization', 'Bearer fake-jwt-token');

      expect(response.statusCode).toBe(404);
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app.getHttpServer()).delete(
        `/establishment/${seededEstablishment.id}/features/${seededFeature.id}`
      );

      expect(response.statusCode).toBe(401);
      expect(response.body).toHaveProperty('message', 'Unauthorized');
    });
  });

  describe('POST /establishment/:id/favorite', () => {
    it('should return 201 on successful favorite addition', async () => {
      const response = await request(app.getHttpServer())
        .post(`/establishment/${seededEstablishment.id}/favorite`)
        .set('Authorization', 'Bearer fake-jwt-token');

      expect(response.statusCode).toBe(201);
    });

    it('should return 401 if user is not authorized', async () => {
      const response = await request(app.getHttpServer()).post(
        `/establishment/${seededEstablishment.id}/favorite`
      );

      expect(response.statusCode).toBe(401);
      expect(response.body).toHaveProperty('message', 'Unauthorized');
    });

    it('should return 404 if establishment not found', async () => {
      const response = await request(app.getHttpServer())
        .post('/establishment/999999/favorite')
        .set('Authorization', 'Bearer fake-jwt-token');

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /establishment/favorites', () => {
    it('should return all favorites for current user', async () => {
      await request(app.getHttpServer())
        .post(`/establishment/${seededEstablishment.id}/favorite`)
        .set('Authorization', 'Bearer fake-jwt-token');

      const response = await request(app.getHttpServer())
        .get('/establishment/favorites')
        .set('Authorization', 'Bearer fake-jwt-token');

      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return 401 if user is not authorized', async () => {
      const response = await request(app.getHttpServer()).get(
        '/establishment/favorites'
      );

      expect(response.statusCode).toBe(401);
      expect(response.body).toHaveProperty('message', 'Unauthorized');
    });

    it('should return empty array if user has no favorites', async () => {
      const response = await request(app.getHttpServer())
        .get('/establishment/favorites')
        .set('Authorization', 'Bearer fake-jwt-token');

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual([]);
    });
  });

  describe('DELETE /establishment/:id/favorite', () => {
    it('should return 200 on successful favorite removal', async () => {
      await request(app.getHttpServer())
        .post(`/establishment/${seededEstablishment.id}/favorite`)
        .set('Authorization', 'Bearer fake-jwt-token');

      const response = await request(app.getHttpServer())
        .delete(`/establishment/${seededEstablishment.id}/favorite`)
        .set('Authorization', 'Bearer fake-jwt-token');

      expect(response.statusCode).toBe(200);
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app.getHttpServer()).delete(
        `/establishment/${seededEstablishment.id}/favorite`
      );

      expect(response.statusCode).toBe(401);
      expect(response.body).toHaveProperty('message', 'Unauthorized');
    });

    it('should return 404 if establishment not found', async () => {
      const response = await request(app.getHttpServer())
        .delete('/establishment/999999/favorite')
        .set('Authorization', 'Bearer fake-jwt-token');

      expect(response.statusCode).toBe(404);
    });

    it('should return 400 if favorite not found', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/establishment/${seededEstablishment.id}/favorite`)
        .set('Authorization', 'Bearer fake-jwt-token');

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /establishment/:id/moderators/:userId', () => {
    it('should return 201 if moderator is added successfully', async () => {
      const response = await request(app.getHttpServer())
        .post(
          `/establishment/${seededEstablishment.id}/moderators/${moderatorUser.id}`
        )
        .set('Authorization', 'Bearer fake-jwt-token');

      expect(response.statusCode).toBe(201);
    });

    it('should return 400 user does not have moderator role', async () => {
      const response = await request(app.getHttpServer())
        .post(
          `/establishment/${seededEstablishment.id}/moderators/${regularUser.id}`
        )
        .set('Authorization', 'Bearer fake-jwt-token');

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if user is already a moderator', async () => {
      await establishmentRepo.save({
        ...seededEstablishment,
        moderators: [moderatorUser],
      });

      const response = await request(app.getHttpServer())
        .post(
          `/establishment/${seededEstablishment.id}/moderators/${moderatorUser.id}`
        )
        .set('Authorization', 'Bearer fake-jwt-token');

      expect(response.statusCode).toBe(400);
    });

    it('should return 404 if establishment is not found', async () => {
      const response = await request(app.getHttpServer())
        .post(`/establishment/999999/moderators/${moderatorUser.id}`)
        .set('Authorization', 'Bearer fake-jwt-token');

      expect(response.statusCode).toBe(404);
    });

    it('should return 404 if user is not found', async () => {
      const response = await request(app.getHttpServer())
        .post(`/establishment/${seededEstablishment.id}/moderators/999999`)
        .set('Authorization', 'Bearer fake-jwt-token');

      expect(response.statusCode).toBe(404);
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app.getHttpServer()).post(
        `/establishment/${seededEstablishment.id}/moderators/${moderatorUser.id}`
      );

      expect(response.statusCode).toBe(401);
      expect(response.body).toHaveProperty('message', 'Unauthorized');
    });
  });

  describe('DELETE /establishment/:id/moderators/:userId', () => {
    it('should return 200 on successful moderator removal', async () => {
      await establishmentRepo.save({
        ...seededEstablishment,
        moderators: [moderatorUser],
      });

      const response = await request(app.getHttpServer())
        .delete(
          `/establishment/${seededEstablishment.id}/moderators/${moderatorUser.id}`
        )
        .set('Authorization', 'Bearer fake-jwt-token');

      expect(response.statusCode).toBe(200);
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app.getHttpServer()).delete(
        `/establishment/${seededEstablishment.id}/moderators/${moderatorUser.id}`
      );

      expect(response.statusCode).toBe(401);
      expect(response.body).toHaveProperty('message', 'Unauthorized');
    });

    it('should return 404 if establishment is not found', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/establishment/999999/moderators/${moderatorUser.id}`)
        .set('Authorization', 'Bearer fake-jwt-token');

      expect(response.statusCode).toBe(404);
    });

    it('should return 400 if moderator user is not found / invalid', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/establishment/${seededEstablishment.id}/moderators/999999`)
        .set('Authorization', 'Bearer fake-jwt-token');

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if establishment does not have moderator', async () => {
      const response = await request(app.getHttpServer())
        .delete(
          `/establishment/${seededEstablishment.id}/moderators/${moderatorUser.id}`
        )
        .set('Authorization', 'Bearer fake-jwt-token');

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /establishment/:id/moderators', () => {
    it('should return 200 on successful moderator retrieval', async () => {
      const response = await request(app.getHttpServer())
        .get(`/establishment/${seededEstablishment.id}/moderators`)
        .set('Authorization', 'Bearer fake-jwt-token');

      expect(response.statusCode).toBe(200);
    });

    it('should return 404 if establishment not found', async () => {
      const response = await request(app.getHttpServer())
        .get('/establishment/999999/moderators')
        .set('Authorization', 'Bearer fake-jwt-token');

      expect(response.statusCode).toBe(404);
    });
  });
});
