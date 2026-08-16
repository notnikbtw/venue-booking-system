import { Order } from '@common/pagination/constants/order';
import {
  PageOptionsDto,
  SortField,
} from '@common/pagination/dto/page-options.dto';
import { FileUploadService } from '@common/services/file-upload.service';
import { GeocodingService } from '@common/services/geocoding.service';
import { Comment } from '@modules/comment/entities/comment.entity';
import { CreateEstablishmentDto } from '@modules/establishment/dto/create-establishment.dto';
import { Establishment } from '@modules/establishment/entities/establishment.entity';
import { EstablishmentService } from '@modules/establishment/establishment.service';
import { EstablishmentType } from '@modules/establishment-type/entities/establishment-type.entity';
import { Feature } from '@modules/features/entities/feature.entity';
import { User, UserRole } from '@modules/users/entities/user.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

describe('EstablishmentService', () => {
  let service: EstablishmentService;
  let establishmentRepository: Repository<Establishment>;
  let userRepository: Repository<User>;
  let establishmentTypeRepository: Repository<EstablishmentType>;
  let featureRepository: Repository<Feature>;
  let geocodingService: GeocodingService;
  let fileUploadService: FileUploadService;

  const mockQueryBuilder = {
    addSelect: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    setParameter: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    addGroupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    andHaving: jest.fn().mockReturnThis(),
    getRawAndEntities: jest.fn().mockResolvedValue({
      entities: [],
      raw: [],
    }),
    clone: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(0),
    getMany: jest.fn().mockResolvedValue([]),
  };

  const mockUserQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(0),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        EstablishmentService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockImplementation((key: string) => {
              if (key === 'MINIMUM_COMMENTS') return 5;
              if (key === 'GLOBAL_AVERAGE_RATING') return 4.0;
              if (key === 'UPLOADS_ESTABLISHMENTS_PATH')
                return 'uploads/establishments';
              return '';
            }),
          },
        },
        {
          provide: getRepositoryToken(Establishment),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            merge: jest
              .fn()
              .mockImplementation((entity: any, ...sources: any[]) =>
                Object.assign(entity, ...sources)
              ),
            find: jest.fn(),
            findOne: jest.fn(),
            findOneBy: jest.fn(),
            delete: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(Feature),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(EstablishmentType),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            findOneBy: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockUserQueryBuilder),
          },
        },
        {
          provide: FileUploadService,
          useValue: {
            getFileUrl: jest
              .fn()
              .mockImplementation((filename: string) => `/uploads/${filename}`),
          },
        },
        {
          provide: GeocodingService,
          useValue: {
            geocode: jest.fn().mockResolvedValue({ lat: 50.0, lng: 20.0 }),
          },
        },
      ],
    }).compile();

    service = module.get<EstablishmentService>(EstablishmentService);
    establishmentRepository = module.get<Repository<Establishment>>(
      getRepositoryToken(Establishment)
    );
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    establishmentTypeRepository = module.get<Repository<EstablishmentType>>(
      getRepositoryToken(EstablishmentType)
    );
    featureRepository = module.get<Repository<Feature>>(
      getRepositoryToken(Feature)
    );
    geocodingService = module.get<GeocodingService>(GeocodingService);
    fileUploadService = module.get<FileUploadService>(FileUploadService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createEstablishmentDto: CreateEstablishmentDto = {
      name: 'Test Establishment',
      city: 'Test City',
      street: 'Test Street',
      building: '10',
      zipCode: '123456',
      description: 'Test Description',
      totalSeats: 50,
      featureIds: [1, 2],
      typeId: 1,
      coverPhoto: { filename: 'cover.jpg' } as Express.Multer.File,
      photos: [{ filename: 'photo1.jpg' }] as Express.Multer.File[],
    };

    const mockType = { id: 1, name: 'Restaurant' } as EstablishmentType;

    it('should successfully create an establishment', async () => {
      const mockUser = { id: 1, name: 'Owner' } as User;
      const mockCreatedEntity = {
        id: 1,
        ...createEstablishmentDto,
      } as unknown as Establishment;

      jest
        .spyOn(establishmentTypeRepository, 'findOne')
        .mockResolvedValue(mockType);
      jest.spyOn(userRepository, 'findOneBy').mockResolvedValue(mockUser);
      jest
        .spyOn(establishmentRepository, 'create')
        .mockReturnValue(mockCreatedEntity);
      jest
        .spyOn(establishmentRepository, 'save')
        .mockResolvedValue(mockCreatedEntity);

      const result = await service.create(createEstablishmentDto, 1);

      expect(result).toEqual(mockCreatedEntity);
      expect(geocodingService.geocode).toHaveBeenCalled();
      expect(fileUploadService.getFileUrl).toHaveBeenCalledWith('cover.jpg');
      expect(establishmentRepository.save).toHaveBeenCalled();
      expect(establishmentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          address: 'Test City, Test Street 10',
        })
      );
    });

    it('should throw error if establishment type not found', async () => {
      jest
        .spyOn(establishmentTypeRepository, 'findOne')
        .mockResolvedValue(null);
      await expect(service.create(createEstablishmentDto, 1)).rejects.toThrow(
        'EstablishmentType 1 not found'
      );
    });

    it('should throw error if user not found', async () => {
      jest
        .spyOn(establishmentTypeRepository, 'findOne')
        .mockResolvedValue(mockType);
      jest
        .spyOn(establishmentRepository, 'create')
        .mockReturnValue({} as Establishment);
      jest.spyOn(userRepository, 'findOneBy').mockResolvedValue(null);
      await expect(service.create(createEstablishmentDto, 1)).rejects.toThrow(
        'User 1 not found'
      );
    });

    it('should throw error if cover photo is missing', async () => {
      await expect(
        service.create(
          { ...createEstablishmentDto, coverPhoto: undefined as any },
          1
        )
      ).rejects.toThrow(
        'Cover photo and at least one establishment photo are required'
      );
    });

    it('should throw error if photos are not uploaded', async () => {
      await expect(
        service.create({ ...createEstablishmentDto, photos: [] }, 1)
      ).rejects.toThrow(
        'Cover photo and at least one establishment photo are required'
      );
    });
  });

  describe('getNearby', () => {
    const mockNearbyEstablishments = [
      { id: 1, name: 'Nearby Est 1', lat: 50.0, lng: 20.0 },
      { id: 2, name: 'Nearby Est 2', lat: 50.1, lng: 20.1 },
    ] as Establishment[];

    it('should return nearby establishments', async () => {
      mockQueryBuilder.getMany.mockResolvedValueOnce(mockNearbyEstablishments);

      const pageOptionsDto: PageOptionsDto = {
        page: 1,
        take: 10,
        order: Order.ASC,
        sortBy: SortField.WEIGHTED_RATING,
        search: '',
        skip: 0,
      };

      const result = await service.getNearby(50.0, 20.0, 10, pageOptionsDto);
      expect(result).toEqual(mockNearbyEstablishments);
      expect(establishmentRepository.createQueryBuilder).toHaveBeenCalledWith(
        'e'
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        expect.stringContaining('< :radius'),
        expect.objectContaining({ lat: 50.0, lng: 20.0, radius: 10 })
      );
    });

    it('should return nearby establishments with search filter and userId', async () => {
      mockQueryBuilder.getMany.mockResolvedValueOnce([
        mockNearbyEstablishments[0],
      ]);
      const mockUser = { id: 1, favorites: [1] } as User;
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);

      const pageOptionsDto: PageOptionsDto = {
        page: 1,
        take: 10,
        order: Order.ASC,
        sortBy: SortField.WEIGHTED_RATING,
        search: 'Nearby',
        skip: 0,
      };

      const result = await service.getNearby(50.0, 20.0, 10, pageOptionsDto, 1);
      expect(result).toEqual([mockNearbyEstablishments[0]]);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        select: ['favorites'],
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('LOWER(e.name) LIKE LOWER(:search)'),
        { search: '%Nearby%' }
      );
    });
  });

  describe('getAllEstablishments', () => {
    const mockEstablishments = [
      {
        id: 1,
        name: 'Test Establishment',
        address: 'Test Address',
        locationDetails: null,
      },
      {
        id: 2,
        name: 'Test Establishment 2',
        address: 'Test Address 2',
        locationDetails: null,
      },
    ] as Establishment[];

    it('should return all establishments paginated', async () => {
      const pageOptionsDto: PageOptionsDto = {
        page: 1,
        take: 10,
        order: Order.DESC,
        sortBy: SortField.WEIGHTED_RATING,
        search: '',
        skip: 0,
      };

      mockQueryBuilder.getRawAndEntities.mockResolvedValueOnce({
        entities: mockEstablishments,
        raw: [
          { commentsCount: '2', avgRating: '4.5', weightedRating: '4.2' },
          { commentsCount: '0', avgRating: '0', weightedRating: '0' },
        ],
      });
      mockQueryBuilder.getCount.mockResolvedValueOnce(
        mockEstablishments.length
      );

      const result = await service.getAllEstablishments(pageOptionsDto);
      expect(result.data).toHaveLength(mockEstablishments.length);
      expect(result.meta.itemCount).toBe(mockEstablishments.length);
    });

    it('should return establishments with search', async () => {
      const pageOptionsDtoWithSearch: PageOptionsDto = {
        page: 1,
        take: 10,
        order: Order.DESC,
        sortBy: SortField.WEIGHTED_RATING,
        search: 'Test',
        skip: 0,
      };

      mockQueryBuilder.getRawAndEntities.mockResolvedValueOnce({
        entities: [mockEstablishments[0]],
        raw: [{ commentsCount: '2', avgRating: '4.5', weightedRating: '4.2' }],
      });
      mockQueryBuilder.getCount.mockResolvedValueOnce(1);

      const result = await service.getAllEstablishments(
        pageOptionsDtoWithSearch
      );
      expect(result.data).toHaveLength(1);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining(
          'LOWER(establishment.name) LIKE LOWER(:search)'
        ),
        { search: '%Test%' }
      );
    });

    it('should return empty array if no establishments found', async () => {
      const pageOptionsDtoWithEmpty: PageOptionsDto = {
        page: 1,
        take: 10,
        order: Order.DESC,
        sortBy: SortField.WEIGHTED_RATING,
        search: '',
        skip: 0,
      };

      mockQueryBuilder.getRawAndEntities.mockResolvedValueOnce({
        entities: [],
        raw: [],
      });
      mockQueryBuilder.getCount.mockResolvedValueOnce(0);

      const result = await service.getAllEstablishments(
        pageOptionsDtoWithEmpty
      );
      expect(result.data).toHaveLength(0);
      expect(result.meta.itemCount).toBe(0);
    });

    it('should return establishments with userId, minRating, and typeId', async () => {
      const pageOptionsDto: PageOptionsDto = {
        page: 1,
        take: 10,
        order: Order.DESC,
        sortBy: SortField.WEIGHTED_RATING,
        search: '',
        skip: 0,
        minRating: 4,
        typeId: 2,
      };

      const mockUser = { id: 1, favorites: [1] } as User;
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);

      mockQueryBuilder.getRawAndEntities.mockResolvedValueOnce({
        entities: mockEstablishments,
        raw: [
          { commentsCount: '2', avgRating: '4.5', weightedRating: '4.2' },
          { commentsCount: '0', avgRating: '0', weightedRating: '0' },
        ],
      });
      mockQueryBuilder.getCount.mockResolvedValueOnce(
        mockEstablishments.length
      );

      const result = await service.getAllEstablishments(pageOptionsDto, 1);
      expect(result.data[0].isFavorite).toBe(true);
      expect(result.data[1].isFavorite).toBe(false);
      expect(mockQueryBuilder.andHaving).toHaveBeenCalledWith(
        'AVG(comments.rating) >= :minRating',
        { minRating: 4 }
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'type.id = :typeId',
        {
          typeId: 2,
        }
      );
    });
  });

  describe('getEstablishmentById', () => {
    const mockEstablishment = {
      id: 1,
      name: 'Test Establishment',
      address: 'Test Address',
      locationDetails: null,
    } as Establishment;

    it('should return the establishment with isFavorite: false if userId is not provided', async () => {
      jest
        .spyOn(establishmentRepository, 'findOne')
        .mockResolvedValue(mockEstablishment);

      const result = await service.getEstablishmentById(1);
      expect(result).toEqual({ ...mockEstablishment, isFavorite: false });
      expect(establishmentRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['type', 'features', 'comments', 'comments.user'],
        loadRelationIds: {
          relations: ['moderators'],
        },
      });
    });

    it('should return the establishment with isFavorite: true if user has favorited it', async () => {
      jest
        .spyOn(establishmentRepository, 'findOne')
        .mockResolvedValue(mockEstablishment);
      mockUserQueryBuilder.getCount.mockResolvedValueOnce(1);

      const result = await service.getEstablishmentById(1, 1);
      expect(result).toEqual({ ...mockEstablishment, isFavorite: true });
    });

    it('should return the establishment with isFavorite: false if user has not favorited it', async () => {
      jest
        .spyOn(establishmentRepository, 'findOne')
        .mockResolvedValue(mockEstablishment);
      mockUserQueryBuilder.getCount.mockResolvedValueOnce(0);

      const result = await service.getEstablishmentById(1, 1);
      expect(result).toEqual({ ...mockEstablishment, isFavorite: false });
    });

    it('should throw NotFoundException if establishment not found', async () => {
      jest.spyOn(establishmentRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getEstablishmentById(99)).rejects.toThrow(
        'Establishment 99 not found'
      );
    });
  });

  describe('getEstablishmentByOwner', () => {
    const mockOwner = {
      id: 1,
      name: 'John Doe',
      email: 'email@example.com',
      role: UserRole.OWNER,
    } as User;

    const mockEstablishments = [
      {
        id: 1,
        name: 'Test Establishment',
        address: 'Test Address',
        locationDetails: null,
        owner: mockOwner,
      },
      {
        id: 2,
        name: 'Test Establishment 2',
        address: 'Test Address 2',
        locationDetails: null,
      },
    ] as Establishment[];

    it('should return all establishments owned by the user', async () => {
      jest
        .spyOn(establishmentRepository, 'find')
        .mockResolvedValue(mockEstablishments);

      const result = await service.getEstablishmentByOwner(mockOwner.id);
      expect(result).toEqual(mockEstablishments);
      expect(establishmentRepository.find).toHaveBeenCalledWith({
        where: { ownerId: mockOwner.id },
        relations: ['type', 'features', 'comments', 'comments.user'],
      });
    });

    it('should throw NotFoundException if owner has no establishments', async () => {
      jest.spyOn(establishmentRepository, 'find').mockResolvedValue([]);

      await expect(service.getEstablishmentByOwner(1)).rejects.toThrow(
        'Establishment for owner 1 not found'
      );
    });
  });

  describe('getAllComments', () => {
    const mockComments = [
      {
        id: 1,
        text: 'Test Comment',
        rating: 5,
        createdAt: new Date(),
        establishment: {
          id: 1,
          name: 'Test Establishment',
        },
        user: {
          id: 1,
          name: 'Test User',
          email: 'email@example.com',
        },
      },
      {
        id: 2,
        text: 'Test Comment 2',
        rating: 4,
        createdAt: new Date(),
        establishment: {
          id: 1,
          name: 'Test Establishment',
        },
        user: {
          id: 2,
          name: 'Test User 2',
          email: 'email2@example.com',
        },
      },
    ] as unknown as Comment[];

    it('should return all comments for an establishment', async () => {
      const mockEstablishment = {
        id: 1,
        name: 'Test Establishment',
        comments: mockComments,
      } as unknown as Establishment;

      jest
        .spyOn(establishmentRepository, 'findOne')
        .mockResolvedValue(mockEstablishment);

      const result = await service.getAllComments(1);
      expect(result).toEqual(mockComments);
      expect(establishmentRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['comments', 'comments.user'],
      });
    });

    it('should throw NotFoundException if establishment not found', async () => {
      jest.spyOn(establishmentRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getAllComments(99)).rejects.toThrow(
        'Establishment 99 not found'
      );
    });
  });

  describe('edit', () => {
    const mockOwner = {
      id: 1,
      name: 'Test Owner',
      role: UserRole.OWNER,
    } as User;

    const mockEstablishment = {
      id: 1,
      name: 'Test Establishment',
      owner: mockOwner,
    } as Establishment;

    it('should edit the establishment', async () => {
      jest
        .spyOn(establishmentRepository, 'findOne')
        .mockResolvedValue(mockEstablishment);
      jest
        .spyOn(establishmentRepository, 'save')
        .mockResolvedValue(mockEstablishment);

      const result = await service.edit(1, {
        name: 'Test Establishment',
      });
      expect(result).toEqual(mockEstablishment);
      expect(establishmentRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['features'],
      });
      expect(establishmentRepository.save).toHaveBeenCalledWith(
        mockEstablishment
      );
    });

    it('should edit location, photos, coverPhoto, and typeId', async () => {
      const existingEst = {
        id: 1,
        name: 'Old Name',
        address: 'Old Address',
        locationDetails: {
          city: 'Old City',
          street: 'Old Street',
          building: '1',
          zipCode: '11111',
        },
        features: [],
      } as unknown as Establishment;

      const mockType = { id: 2, name: 'Cafe' } as EstablishmentType;

      jest
        .spyOn(establishmentRepository, 'findOne')
        .mockResolvedValue(existingEst);
      jest
        .spyOn(establishmentTypeRepository, 'findOne')
        .mockResolvedValue(mockType);
      jest
        .spyOn(geocodingService, 'geocode')
        .mockResolvedValue({ lat: 51.0, lng: 21.0 });
      jest
        .spyOn(establishmentRepository, 'save')
        .mockImplementation(async (est: any) => est);

      const result = await service.edit(1, {
        name: 'New Name',
        city: 'New City',
        street: 'New Street',
        building: '2',
        zipCode: '22222',
        typeId: 2,
        coverPhoto: { filename: 'new-cover.jpg' } as Express.Multer.File,
        photos: [{ filename: 'new-photo.jpg' }] as Express.Multer.File[],
      });

      expect(result.name).toBe('New Name');
      expect(result.address).toBe('New City, New Street 2, 22222');
      expect(result.lat).toBe(51.0);
      expect(result.lng).toBe(21.0);
      expect(result.coverPhoto).toBe('/uploads/new-cover.jpg');
      expect(result.photos).toEqual(['/uploads/new-photo.jpg']);
      expect(result.type).toEqual(mockType);
    });

    it('should throw BadRequestException if location update is missing required fields', async () => {
      const existingEst = {
        id: 1,
        name: 'Old Name',
        locationDetails: null,
        features: [],
      } as unknown as Establishment;

      jest
        .spyOn(establishmentRepository, 'findOne')
        .mockResolvedValue(existingEst);

      await expect(
        service.edit(1, {
          city: 'New City',
        })
      ).rejects.toThrow(
        new BadRequestException(
          'city, street, and building are required to update establishment location'
        )
      );
    });

    it('should throw NotFoundException if updated typeId is not found', async () => {
      const existingEst = {
        id: 1,
        name: 'Old Name',
        features: [],
      } as unknown as Establishment;

      jest
        .spyOn(establishmentRepository, 'findOne')
        .mockResolvedValue(existingEst);
      jest
        .spyOn(establishmentTypeRepository, 'findOne')
        .mockResolvedValue(null);

      await expect(service.edit(1, { typeId: 99 })).rejects.toThrow(
        new NotFoundException('EstablishmentType 99 not found')
      );
    });

    it('should throw error if establishment not found', async () => {
      jest.spyOn(establishmentRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.edit(1, {
          name: 'Test Establishment',
        })
      ).rejects.toThrow('Establishment 1 not found');
    });
  });

  describe('remove', () => {
    it('should successfully remove the establishment', async () => {
      jest
        .spyOn(establishmentRepository, 'delete')
        .mockResolvedValue({ affected: 1, raw: {} });

      await expect(service.remove(1)).resolves.not.toThrow();
      expect(establishmentRepository.delete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException if establishment not found (affected === 0)', async () => {
      jest
        .spyOn(establishmentRepository, 'delete')
        .mockResolvedValue({ affected: 0, raw: {} });

      await expect(service.remove(99)).rejects.toThrow(
        new NotFoundException('Establishment 99 not found')
      );
    });
  });

  describe('findOneWithFeatures', () => {
    const mockEstablishment = {
      id: 1,
      name: 'Test Establishment',
      features: [
        {
          id: 1,
          name: 'Test Feature',
        },
      ],
    } as Establishment;

    it('should return the establishment with features', async () => {
      jest
        .spyOn(establishmentRepository, 'findOne')
        .mockResolvedValue(mockEstablishment);

      const result = await service.findOneWithFeatures(1);
      expect(result).toEqual(mockEstablishment);
      expect(establishmentRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['features', 'comments', 'comments.user'],
      });
    });

    it('should throw error if establishment not found', async () => {
      jest.spyOn(establishmentRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findOneWithFeatures(1)).rejects.toThrow(
        'Establishment 1 not found'
      );
    });
  });

  describe('addFeature', () => {
    const mockFeature = {
      id: 1,
      name: 'Test Feature',
    } as Feature;

    it('should add a feature to the establishment', async () => {
      const mockEstablishment = {
        id: 1,
        name: 'Test Establishment',
        features: [
          {
            id: 2,
            name: 'Test Feature 2',
          },
        ],
      } as Establishment;

      jest
        .spyOn(establishmentRepository, 'findOne')
        .mockResolvedValue(mockEstablishment);
      jest.spyOn(featureRepository, 'findOne').mockResolvedValue(mockFeature);
      jest
        .spyOn(establishmentRepository, 'save')
        .mockResolvedValue(mockEstablishment);

      const result = await service.addFeature(1, 1);
      expect(result).toEqual(mockEstablishment);
      expect(establishmentRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['features'],
      });
      expect(featureRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(establishmentRepository.save).toHaveBeenCalledWith(
        mockEstablishment
      );
    });

    it('should throw BadRequestException if feature is already added to the establishment', async () => {
      const mockEstablishment = {
        id: 1,
        name: 'Test Establishment',
        features: [mockFeature],
      } as Establishment;

      jest
        .spyOn(establishmentRepository, 'findOne')
        .mockResolvedValue(mockEstablishment);
      jest.spyOn(featureRepository, 'findOne').mockResolvedValue(mockFeature);

      await expect(service.addFeature(1, 1)).rejects.toThrow(
        new BadRequestException('Feature already added to this establishment')
      );
    });

    it('should throw error if establishment not found', async () => {
      const mockEstablishment = {
        id: 1,
        name: 'Test Establishment',
      } as Establishment;

      jest.spyOn(establishmentRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(featureRepository, 'findOne').mockResolvedValue(mockFeature);
      jest
        .spyOn(establishmentRepository, 'save')
        .mockResolvedValue(mockEstablishment);

      await expect(service.addFeature(1, 1)).rejects.toThrow(
        'Establishment 1 not found'
      );
    });

    it('should throw error if feature not found', async () => {
      const mockEstablishment = {
        id: 1,
        name: 'Test Establishment',
      } as Establishment;

      jest
        .spyOn(establishmentRepository, 'findOne')
        .mockResolvedValue(mockEstablishment);
      jest.spyOn(featureRepository, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(establishmentRepository, 'save')
        .mockResolvedValue(mockEstablishment);

      await expect(service.addFeature(1, 99)).rejects.toThrow(
        'Feature 99 not found'
      );
    });
  });

  describe('removeFeature', () => {
    const mockFeature = {
      id: 1,
      name: 'Test Feature',
    } as Feature;

    it('should remove a feature from the establishment', async () => {
      const mockEstablishment = {
        id: 1,
        name: 'Test Establishment',
        features: [mockFeature],
      } as Establishment;

      jest
        .spyOn(establishmentRepository, 'findOne')
        .mockResolvedValue(mockEstablishment);
      jest
        .spyOn(establishmentRepository, 'save')
        .mockResolvedValue(mockEstablishment);

      const result = await service.removeFeature(1, 1);
      expect(result).toEqual(mockEstablishment);
      expect(establishmentRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['features'],
      });
      expect(establishmentRepository.save).toHaveBeenCalledWith(
        mockEstablishment
      );
    });

    it('should throw error if establishment not found', async () => {
      jest.spyOn(establishmentRepository, 'findOne').mockResolvedValue(null);

      await expect(service.removeFeature(1, 1)).rejects.toThrow(
        'Establishment 1 not found'
      );
    });

    it('should throw error if feature not found in establishment', async () => {
      const mockEstablishment = {
        id: 1,
        name: 'Test Establishment',
        features: [mockFeature],
      } as unknown as Establishment;

      jest
        .spyOn(establishmentRepository, 'findOne')
        .mockResolvedValue(mockEstablishment);

      await expect(service.removeFeature(1, 99)).rejects.toThrow(
        'Feature 99 not found in this establishment'
      );
    });
  });

  describe('addFavorite', () => {
    const mockEstablishment = {
      id: 1,
      name: 'Test Establishment',
    } as Establishment;

    it('should add establishment to user favorites when favorites is undefined', async () => {
      const mockUser = {
        id: 1,
        name: 'Test User',
        favorites: undefined,
      } as unknown as User;

      jest
        .spyOn(establishmentRepository, 'findOneBy')
        .mockResolvedValue(mockEstablishment);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest
        .spyOn(userRepository, 'save')
        .mockResolvedValue({ ...mockUser, favorites: [1] } as User);

      const result = await service.addFavorite(1, 1);
      expect(result).toEqual([1]);
      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ favorites: [1] })
      );
    });

    it('should append establishment to user favorites when user already has favorites', async () => {
      const mockUser = {
        id: 1,
        name: 'Test User',
        favorites: [2, 3],
      } as User;

      jest
        .spyOn(establishmentRepository, 'findOneBy')
        .mockResolvedValue(mockEstablishment);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest
        .spyOn(userRepository, 'save')
        .mockResolvedValue({ ...mockUser, favorites: [2, 3, 1] } as User);

      const result = await service.addFavorite(1, 1);
      expect(result).toEqual([2, 3, 1]);
      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ favorites: [2, 3, 1] })
      );
    });

    it('should not duplicate establishment if already in favorites', async () => {
      const mockUser = {
        id: 1,
        name: 'Test User',
        favorites: [1, 2],
      } as User;

      jest
        .spyOn(establishmentRepository, 'findOneBy')
        .mockResolvedValue(mockEstablishment);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);

      const result = await service.addFavorite(1, 1);
      expect(result).toEqual([1, 2]);
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if establishment is not found', async () => {
      jest.spyOn(establishmentRepository, 'findOneBy').mockResolvedValue(null);

      await expect(service.addFavorite(1, 99)).rejects.toThrow(
        new NotFoundException('Establishment 99 not found')
      );
    });

    it('should throw NotFoundException if user is not found', async () => {
      jest
        .spyOn(establishmentRepository, 'findOneBy')
        .mockResolvedValue(mockEstablishment);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(service.addFavorite(99, 1)).rejects.toThrow(
        new NotFoundException('User 99 not found')
      );
    });
  });

  describe('removeFavorite', () => {
    const mockEstablishment = {
      id: 1,
      name: 'Test Establishment',
    } as Establishment;

    it('should successfully remove establishment from user favorites', async () => {
      const mockUser = {
        id: 1,
        name: 'Test User',
        favorites: [1, 2],
      } as User;

      jest
        .spyOn(establishmentRepository, 'findOneBy')
        .mockResolvedValue(mockEstablishment);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest
        .spyOn(userRepository, 'save')
        .mockResolvedValue({ ...mockUser, favorites: [2] } as User);

      await service.removeFavorite(1, 1);
      expect(mockUser.favorites).toEqual([2]);
      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ favorites: [2] })
      );
    });

    it('should throw NotFoundException if establishment is not found', async () => {
      jest.spyOn(establishmentRepository, 'findOneBy').mockResolvedValue(null);

      await expect(service.removeFavorite(1, 99)).rejects.toThrow(
        new NotFoundException('Establishment 99 not found')
      );
    });

    it('should throw NotFoundException if user is not found', async () => {
      jest
        .spyOn(establishmentRepository, 'findOneBy')
        .mockResolvedValue(mockEstablishment);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(service.removeFavorite(99, 1)).rejects.toThrow(
        new NotFoundException('User 99 not found')
      );
    });

    it('should throw BadRequestException if user favorites does not include establishment', async () => {
      const mockUser = {
        id: 1,
        name: 'Test User',
        favorites: [2, 3],
      } as User;

      jest
        .spyOn(establishmentRepository, 'findOneBy')
        .mockResolvedValue(mockEstablishment);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);

      await expect(service.removeFavorite(1, 1)).rejects.toThrow(
        new BadRequestException(
          'User 1 does not have this establishment as favorite'
        )
      );
    });

    it('should throw BadRequestException if user favorites is undefined', async () => {
      const mockUser = {
        id: 1,
        name: 'Test User',
        favorites: undefined,
      } as unknown as User;

      jest
        .spyOn(establishmentRepository, 'findOneBy')
        .mockResolvedValue(mockEstablishment);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);

      await expect(service.removeFavorite(1, 1)).rejects.toThrow(
        new BadRequestException(
          'User 1 does not have this establishment as favorite'
        )
      );
    });
  });

  describe('getAllFavorites', () => {
    it('should return all favorite establishments with isFavorite set to true', async () => {
      const mockUser = {
        id: 1,
        name: 'Test User',
        favorites: [1, 2],
      } as User;

      const mockEstablishments = [
        { id: 1, name: 'Est 1' },
        { id: 2, name: 'Est 2' },
      ] as Establishment[];

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest
        .spyOn(establishmentRepository, 'find')
        .mockResolvedValue(mockEstablishments);

      const result = await service.getAllFavorites(1);
      expect(result).toEqual([
        { id: 1, name: 'Est 1', isFavorite: true },
        { id: 2, name: 'Est 2', isFavorite: true },
      ]);
      expect(establishmentRepository.find).toHaveBeenCalledWith({
        where: { id: In([1, 2]) },
        relations: ['type', 'features'],
      });
    });

    it('should return empty array if user has empty favorites array', async () => {
      const mockUser = {
        id: 1,
        name: 'Test User',
        favorites: [],
      } as unknown as User;

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);

      const result = await service.getAllFavorites(1);
      expect(result).toEqual([]);
      expect(establishmentRepository.find).not.toHaveBeenCalled();
    });

    it('should return empty array if user favorites is undefined', async () => {
      const mockUser = {
        id: 1,
        name: 'Test User',
        favorites: undefined,
      } as unknown as User;

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);

      const result = await service.getAllFavorites(1);
      expect(result).toEqual([]);
    });

    it('should throw NotFoundException if user is not found', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getAllFavorites(99)).rejects.toThrow(
        new NotFoundException('User 99 not found')
      );
    });
  });

  describe('addModerator', () => {
    const mockOwner = {
      id: 1,
      name: 'Owner User',
      role: UserRole.OWNER,
    } as User;

    const mockSuperAdmin = {
      id: 10,
      name: 'Super Admin',
      role: UserRole.SUPER_ADMIN,
    } as User;

    const mockModUser = {
      id: 2,
      name: 'Mod User',
      role: UserRole.MODERATOR,
    } as User;

    const mockEstablishment = {
      id: 1,
      name: 'Test Establishment',
      ownerId: 1,
      owner: mockOwner,
      moderators: [],
    } as unknown as Establishment;

    it('should successfully add a moderator when called by the owner', async () => {
      const estWithoutMods = {
        id: 1,
        name: 'Test Establishment',
        ownerId: 1,
        owner: mockOwner,
        moderators: undefined,
      } as unknown as Establishment;

      jest
        .spyOn(establishmentRepository, 'findOne')
        .mockResolvedValue(estWithoutMods);
      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValueOnce(mockOwner)
        .mockResolvedValueOnce(mockModUser);
      jest
        .spyOn(establishmentRepository, 'save')
        .mockImplementation(async (entity: any) => entity);

      const result = await service.addModerator(1, 2, 1);
      expect(result.moderators).toEqual([mockModUser]);
      expect(establishmentRepository.save).toHaveBeenCalled();
    });

    it('should successfully add a moderator when called by SUPER_ADMIN', async () => {
      const establishment = {
        id: 1,
        name: 'Test Establishment',
        ownerId: 1,
        owner: mockOwner,
        moderators: [],
      } as unknown as Establishment;

      jest
        .spyOn(establishmentRepository, 'findOne')
        .mockResolvedValue(establishment);
      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValueOnce(mockSuperAdmin)
        .mockResolvedValueOnce(mockModUser);
      jest
        .spyOn(establishmentRepository, 'save')
        .mockImplementation(async (entity: any) => entity);

      const result = await service.addModerator(1, 2, 10);
      expect(result.moderators).toContainEqual(mockModUser);
      expect(establishmentRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if establishment is not found', async () => {
      jest.spyOn(establishmentRepository, 'findOne').mockResolvedValue(null);

      await expect(service.addModerator(99, 2, 1)).rejects.toThrow(
        new NotFoundException('Establishment 99 not found')
      );
    });

    it('should throw NotFoundException if current user is not found', async () => {
      jest
        .spyOn(establishmentRepository, 'findOne')
        .mockResolvedValue(mockEstablishment);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(service.addModerator(1, 2, 99)).rejects.toThrow(
        new NotFoundException('Current user 99 not found')
      );
    });

    it('should throw BadRequestException if current user has no permission', async () => {
      const unauthorizedUser = {
        id: 5,
        name: 'Regular User',
        role: UserRole.USER,
      } as User;

      jest
        .spyOn(establishmentRepository, 'findOne')
        .mockResolvedValue(mockEstablishment);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(unauthorizedUser);

      await expect(service.addModerator(1, 2, 5)).rejects.toThrow(
        new BadRequestException(
          'User 5 does not have permission to add moderators'
        )
      );
    });

    it('should throw NotFoundException if target user is not found', async () => {
      jest
        .spyOn(establishmentRepository, 'findOne')
        .mockResolvedValue(mockEstablishment);
      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValueOnce(mockOwner)
        .mockResolvedValueOnce(null);

      await expect(service.addModerator(1, 99, 1)).rejects.toThrow(
        new NotFoundException('User 99 not found')
      );
    });

    it('should throw BadRequestException if target user is not a moderator', async () => {
      const nonModUser = {
        id: 3,
        name: 'Regular User',
        role: UserRole.USER,
      } as User;

      jest
        .spyOn(establishmentRepository, 'findOne')
        .mockResolvedValue(mockEstablishment);
      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValueOnce(mockOwner)
        .mockResolvedValueOnce(nonModUser);

      await expect(service.addModerator(1, 3, 1)).rejects.toThrow(
        new BadRequestException('User 3 is not a moderator')
      );
    });

    it('should throw BadRequestException if target user is already a moderator of the establishment', async () => {
      const establishmentWithMod = {
        id: 1,
        name: 'Test Establishment',
        ownerId: 1,
        owner: mockOwner,
        moderators: [mockModUser],
      } as unknown as Establishment;

      jest
        .spyOn(establishmentRepository, 'findOne')
        .mockResolvedValue(establishmentWithMod);
      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValueOnce(mockOwner)
        .mockResolvedValueOnce(mockModUser);

      await expect(service.addModerator(1, 2, 1)).rejects.toThrow(
        new BadRequestException(
          'User 2 is already a moderator of this establishment'
        )
      );
    });
  });

  describe('removeModerator', () => {
    const mockOwner = {
      id: 1,
      name: 'Owner User',
      role: UserRole.OWNER,
    } as User;

    const mockSuperAdmin = {
      id: 10,
      name: 'Super Admin',
      role: UserRole.SUPER_ADMIN,
    } as User;

    const mockModUser = {
      id: 2,
      name: 'Mod User',
      role: UserRole.MODERATOR,
    } as User;

    it('should successfully remove a moderator when called by owner', async () => {
      const establishment = {
        id: 1,
        name: 'Test Establishment',
        ownerId: 1,
        owner: mockOwner,
        moderators: [mockModUser],
      } as unknown as Establishment;

      jest
        .spyOn(establishmentRepository, 'findOne')
        .mockResolvedValue(establishment);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockOwner);
      jest
        .spyOn(establishmentRepository, 'save')
        .mockImplementation(async (entity: any) => entity);

      const result = await service.removeModerator(1, 2, 1);
      expect(result.moderators).toEqual([]);
      expect(establishmentRepository.save).toHaveBeenCalled();
    });

    it('should successfully remove a moderator when called by SUPER_ADMIN', async () => {
      const establishment = {
        id: 1,
        name: 'Test Establishment',
        ownerId: 1,
        owner: mockOwner,
        moderators: [mockModUser],
      } as unknown as Establishment;

      jest
        .spyOn(establishmentRepository, 'findOne')
        .mockResolvedValue(establishment);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockSuperAdmin);
      jest
        .spyOn(establishmentRepository, 'save')
        .mockImplementation(async (entity: any) => entity);

      const result = await service.removeModerator(1, 2, 10);
      expect(result.moderators).toEqual([]);
      expect(establishmentRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if establishment is not found', async () => {
      jest.spyOn(establishmentRepository, 'findOne').mockResolvedValue(null);

      await expect(service.removeModerator(99, 2, 1)).rejects.toThrow(
        new NotFoundException('Establishment 99 not found')
      );
    });

    it('should throw NotFoundException if current user is not found', async () => {
      const establishment = {
        id: 1,
        name: 'Test Establishment',
        ownerId: 1,
        owner: mockOwner,
        moderators: [mockModUser],
      } as unknown as Establishment;

      jest
        .spyOn(establishmentRepository, 'findOne')
        .mockResolvedValue(establishment);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(service.removeModerator(1, 2, 99)).rejects.toThrow(
        new NotFoundException('Current user 99 not found')
      );
    });

    it('should throw BadRequestException if current user has no permission', async () => {
      const unauthorizedUser = {
        id: 5,
        name: 'Regular User',
        role: UserRole.USER,
      } as User;

      const establishment = {
        id: 1,
        name: 'Test Establishment',
        ownerId: 1,
        owner: mockOwner,
        moderators: [mockModUser],
      } as unknown as Establishment;

      jest
        .spyOn(establishmentRepository, 'findOne')
        .mockResolvedValue(establishment);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(unauthorizedUser);

      await expect(service.removeModerator(1, 2, 5)).rejects.toThrow(
        new BadRequestException(
          "You don't have permission to remove moderators from this establishment"
        )
      );
    });

    it('should throw BadRequestException if user is not a moderator of this establishment', async () => {
      const establishment = {
        id: 1,
        name: 'Test Establishment',
        ownerId: 1,
        owner: mockOwner,
        moderators: [],
      } as unknown as Establishment;

      jest
        .spyOn(establishmentRepository, 'findOne')
        .mockResolvedValue(establishment);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockOwner);

      await expect(service.removeModerator(1, 2, 1)).rejects.toThrow(
        new BadRequestException(
          'User 2 is not a moderator of this establishment'
        )
      );
    });
  });

  describe('getModerators', () => {
    it('should return all moderators for the establishment', async () => {
      const mockModerators = [
        {
          id: 2,
          name: 'Mod User 1',
          email: 'mod1@test.com',
          role: UserRole.MODERATOR,
          password: 'secret',
        },
        {
          id: 3,
          name: 'Mod User 2',
          email: 'mod2@test.com',
          role: UserRole.MODERATOR,
          password: 'secret',
        },
      ] as unknown as User[];

      const establishment = {
        id: 1,
        name: 'Test Establishment',
        moderators: mockModerators,
      } as unknown as Establishment;

      jest
        .spyOn(establishmentRepository, 'findOne')
        .mockResolvedValue(establishment);

      const result = await service.getModerators(1);
      expect(result).toEqual([
        {
          id: 2,
          name: 'Mod User 1',
          email: 'mod1@test.com',
          role: UserRole.MODERATOR,
        },
        {
          id: 3,
          name: 'Mod User 2',
          email: 'mod2@test.com',
          role: UserRole.MODERATOR,
        },
      ]);
      expect(establishmentRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['owner', 'moderators'],
      });
    });

    it('should throw NotFoundException if establishment is not found', async () => {
      jest.spyOn(establishmentRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getModerators(99)).rejects.toThrow(
        new NotFoundException('Establishment 99 not found')
      );
    });
  });
});
