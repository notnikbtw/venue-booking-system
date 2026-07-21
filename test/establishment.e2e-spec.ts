import { JwtAuthGuard } from '@common/guard/jwt-auth.guard';
import { RolesGuard } from '@common/guard/jwt-roles.guard';
import { FileUploadService } from '@common/services/file-upload.service';
import { GeocodingService } from '@common/services/geocoding.service';
import { Establishment } from '@modules/establishment/entities/establishment.entity';
import { EstablishmentType } from '@modules/establishment-type/entities/establishment-type.entity';
import { Feature } from '@modules/features/entities/feature.entity';
import { User } from '@modules/users/entities/user.entity';
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

describe('Establishment System', () => {
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

          request.user = { id: 1, role: 'OWNER' };
          return true;
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })

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
          if (key === 'MINIMUM_COMMENTS') return 5;
          if (key === 'GLOBAL_AVERAGE_RATING') return 4.5;
          if (key === 'UPLOADS_ESTABLISHMENTS_PATH') return 'uploads/test';
          return 'some-value';
        }),
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

      .overrideProvider(getRepositoryToken(Feature))
      .useValue({
        findBy: jest.fn().mockResolvedValue([{ id: 1, name: 'WiFi' }]),
      })
      .overrideProvider(getRepositoryToken(EstablishmentType))
      .useValue({
        findOne: jest.fn().mockResolvedValue({ id: 1, name: 'Restaurant' }),
      })
      .overrideProvider(getRepositoryToken(User))
      .useValue({
        findOneBy: jest.fn().mockResolvedValue({ id: 1, name: 'Owner User' }),
        findOne: jest.fn().mockResolvedValue({
          id: 1,
          name: 'Owner User',
          favorites: [1],
        }),
        createQueryBuilder: jest.fn().mockImplementation(() => {
          const queryBuilderMock = {
            select: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            getRawOne: jest.fn().mockResolvedValue({ sum: '0' }),
          };
          return queryBuilderMock;
        }),
      })

      .overrideProvider(getRepositoryToken(Establishment))
      .useValue({
        find: jest.fn().mockResolvedValue([
          {
            id: 1,
            name: 'Restaurant',
            address: 'New York, Street 123',
            locationDetails: {
              city: 'New York',
              street: 'Street',
              building: '123',
              zipCode: '00501',
            },
            lat: 45.123,
            lng: 14.456,
            description: 'Calm and comfortable establishment',
            totalSeats: 50,
            rating: 4.5,
            coverPhoto: 'https://placehold.co/600x400',
            photos: [
              'https://placehold.co/600x400',
              'https://placehold.co/600x400',
            ],
            type: { id: 1, name: 'Restaurant' },
            ownerId: 1,
            owner: { id: 1, name: 'Owner User' },
          },
        ]),
        findOne: jest.fn().mockImplementation(options => {
          if (options.where.id === 1) {
            return Promise.resolve({
              id: 1,
              name: 'Restaurant',
              address: 'New York, Street 123',
              locationDetails: {
                city: 'New York',
                street: 'Street',
                building: '123',
                zipCode: '00501',
              },
              lat: 45.123,
              lng: 14.456,
              description: 'Calm and comfortable establishment',
              totalSeats: 50,
              rating: 4.5,
              coverPhoto: 'https://placehold.co/600x400',
              photos: [
                'https://placehold.co/600x400',
                'https://placehold.co/600x400',
              ],
              type: { id: 1, name: 'Restaurant' },
              ownerId: 1,
              owner: { id: 1, name: 'Owner User' },
              comments: [
                {
                  id: 10,
                  text: 'Great experience!',
                  createdAt: '2026-07-20T10:00:00.000Z',
                  user: { id: 5, name: 'User' },
                },
              ],
            });
          }
          if (options.where.id === 2) {
            return Promise.resolve({
              id: 2,
              ownerId: 2,
              owner: { id: 2 },
            });
          }
        }),
        findOneBy: jest.fn().mockResolvedValue({
          id: 1,
          name: 'Restaurant',
          address: 'New York, Street 123',
          locationDetails: {
            city: 'New York',
            street: 'Street',
            building: '123',
            zipCode: '00501',
          },
          lat: 45.123,
          lng: 14.456,
          description: 'Calm and comfortable establishment',
          totalSeats: 50,
          rating: 4.5,
          coverPhoto: 'https://placehold.co/600x400',
          photos: [
            'https://placehold.co/600x400',
            'https://placehold.co/600x400',
          ],
          type: { id: 1, name: 'Restaurant' },
          ownerId: 1,
          owner: { id: 1, name: 'Owner User' },
        }),

        createQueryBuilder: jest.fn().mockImplementation(() => {
          const queryBuilderMock = {
            select: jest.fn().mockReturnThis(),
            addSelect: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            leftJoin: jest.fn().mockReturnThis(),
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            setParameter: jest.fn().mockReturnThis(),
            groupBy: jest.fn().mockReturnThis(),
            addGroupBy: jest.fn().mockReturnThis(),
            andHaving: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            addOrderBy: jest.fn().mockReturnThis(),
            offset: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            clone: jest.fn().mockImplementation(() => queryBuilderMock),
            getRawAndEntities: jest.fn().mockResolvedValue({
              entities: [
                {
                  id: 1,
                  name: 'Restaurant',
                  address: 'New York, Street 123',
                  locationDetails: {
                    city: 'New York',
                    street: 'Street',
                    building: '123',
                    zipCode: '00501',
                  },
                  lat: 45.123,
                  lng: 14.456,
                  description: 'Calm and comfortable establishment',
                  totalSeats: 50,
                  rating: 4.5,
                  coverPhoto: 'https://placehold.co/600x400',
                  photos: [
                    'https://placehold.co/600x400',
                    'https://placehold.co/600x400',
                  ],
                  type: { id: 1, name: 'Restaurant' },
                  owner: { id: 1, name: 'Owner User' },
                },
              ],
              raw: [
                {
                  commentsCount: '5',
                  avgRating: '4.5',
                  weightedRating: '4.5',
                },
              ],
            }),
            getCount: jest.fn().mockResolvedValue(1),
            getRawOne: jest.fn().mockResolvedValue({ sum: '0' }),
          };
          return queryBuilderMock;
        }),

        create: jest.fn().mockImplementation(dto => dto),

        merge: jest.fn().mockImplementation((entity, dto) => {
          Object.assign(entity, dto);
          return entity;
        }),

        save: jest.fn().mockImplementation(dto =>
          Promise.resolve({
            id: 1,
            ...dto,
          })
        ),
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
        .field('featureIds[]', 1)
        .field('typeId', 1)
        .attach('coverPhoto', fakeFile, 'cover.jpg')
        .attach('photos', fakeFile, 'photo1.jpg')
        .attach('photos', fakeFile, 'photo2.jpg');

      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.id).toBe(1);
      expect(response.body.name).toBe('Restaurant');
      expect(response.body.locationDetails.city).toBe('New York');
      expect(response.body.locationDetails.street).toBe('Street');
      expect(response.body.locationDetails.building).toBe('123');
      expect(response.body.locationDetails.zipCode).toBe('00501');
      expect(response.body.totalSeats).toBe('50');
      expect(response.body.coverPhoto).toBe('https://placehold.co/600x400');
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
      expect(response.body.message).toBe('Unauthorized');
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
      const establishment = response.body.data[0];
      expect(establishment.id).toBe(1);
      expect(establishment.name).toBe('Restaurant');
      expect(establishment.commentsCount).toBe(5);
      expect(establishment.avgRating).toBe(4.5);
      expect(establishment.weightedRating).toBe(4.5);
      expect(establishment.isFavorite).toBe(false);
    });
  });

  describe('GET /establishment/:id', () => {
    it('should return all establishments', async () => {
      const response = await request(app.getHttpServer()).get(
        '/establishment/1'
      );

      expect(response.statusCode).toBe(200);
      expect(response.body.id).toBe(1);
      expect(response.body.name).toBe('Restaurant');
    });

    it('should return 404 if establishment not found', async () => {
      const response = await request(app.getHttpServer()).get(
        '/establishment/999'
      );

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /me', () => {
    it('should return current owner establishments', async () => {
      const response = await request(app.getHttpServer())
        .get('/establishment/me')
        .set('Authorization', 'Bearer fake-jwt-token');

      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      const establishment = response.body[0];
      expect(establishment.id).toBe(1);
      expect(establishment.owner.id).toBe(1);
    });

    it('should return 401 if user is not authorized', async () => {
      const response = await request(app.getHttpServer()).get(
        '/establishment/me'
      );

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /establishment/favorites', () => {
    it('should return all favorites for current user', async () => {
      const response = await request(app.getHttpServer())
        .get('/establishment/favorites')
        .set('Authorization', 'Bearer fake-jwt-token');

      expect(response.statusCode).toBe(200);
    });

    it('should return 401 if user is not authorized', async () => {
      const response = await request(app.getHttpServer()).get(
        '/establishment/favorites'
      );
      expect(response.statusCode).toBe(401);
      expect(response.body.message).toBe('Unauthorized');
    });
  });

  describe('GET /establishment/:id/comments', () => {
    it('should return all comments from establishment', async () => {
      const response = await request(app.getHttpServer()).get(
        '/establishment/1/comments'
      );

      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0].text).toBe('Great experience!');
    });

    it('should return 404 if establishment not found', async () => {
      const response = await request(app.getHttpServer()).get(
        '/establishment/999/comments'
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
    it('should retutn 200 on sucseful establishment update', async () => {
      const response = await request(app.getHttpServer())
        .patch('/establishment/1')
        .set('Authorization', 'Bearer fake-jwt-token')
        .field('name', 'Cafe')
        .field('city', 'Miami')
        .field('street', 'Street')
        .field('building', '987')
        .field('zipCode', '33129')
        .field('totalSeats', 15);

      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.body)).toBe(false);
      expect(response.body.id).toBe(1);
      expect(response.body.ownerId).toBe(1);
      expect(response.body.name).toBe('Cafe');
      expect(response.body.city).toBe('Miami');
      expect(response.body.description).toBe(
        'Calm and comfortable establishment'
      );
      expect(response.body.totalSeats).toBe('15');
    });

    it('should update establishment cover photo if uploaded', async () => {
      const response = await request(app.getHttpServer())
        .patch('/establishment/1')
        .set('Authorization', 'Bearer fake-jwt-token')
        .attach('coverPhoto', Buffer.from('fake image content'), 'cover.jpg');

      expect(response.statusCode).toBe(200);
      expect(response.body.coverPhoto).toBeDefined();
    });

    it('should return 401 if no authorization header provided', async () => {
      const response = await request(app.getHttpServer())
        .patch('/establishment/1')
        .field('name', 'New Name');

      expect(response.statusCode).toBe(401);
    });

    it('should return 403 if user does not own the establishment', async () => {
      const response = await request(app.getHttpServer())
        .patch('/establishment/2')
        .set('Authorization', 'Bearer fake-jwt-token')
        .field('name', 'Hacked Name');

      expect(response.statusCode).toBe(403);
    });

    it('should return 404 if establishment does not exist', async () => {
      const response = await request(app.getHttpServer())
        .patch('/establishment/999999')
        .set('Authorization', 'Bearer fake-jwt-token')
        .field('name', 'New Name');

      expect(response.statusCode).toBe(404);
    });
  });
});
