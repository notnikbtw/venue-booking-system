import { JwtAuthGuard } from '@common/guard/jwt-auth.guard';
import { RolesGuard } from '@common/guard/jwt-roles.guard';
import { Establishment } from '@modules/establishment/entities/establishment.entity';
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
import { FileUploadService } from '@/common/services/file-upload.service';
import { GeocodingService } from '@/common/services/geocoding.service';
import { EstablishmentType } from '@/modules/establishment-type/entities/establishment-type.entity';
import { Feature } from '@/modules/features/entities/feature.entity';
import { User } from '@/modules/users/entities/user.entity';

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
      })

      .overrideProvider(getRepositoryToken(Establishment))
      .useValue({
        find: jest.fn().mockResolvedValue([]),
        findOne: jest.fn().mockResolvedValue(null),
        findOneBy: jest.fn().mockResolvedValue(null),

        createQueryBuilder: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue({ sum: '0' }),
        }),

        create: jest.fn().mockImplementation(dto => dto),

        save: jest.fn().mockImplementation(dto => {
          return {
            id: 1,
            ...dto,
          };
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
    it('should return 401 if if user is not authorized', async () => {
      const response = await request(app.getHttpServer()).post(
        '/establishment'
      );

      expect(response.statusCode).toBe(401);
      expect(response.body.message).toBe('Unauthorized');
    });
  });
});
