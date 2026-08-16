import { PageDto } from '@common/pagination/dto/page.dto';
import { FileUploadService } from '@common/services/file-upload.service';
import { Comment } from '@modules/comment/entities/comment.entity';
import { CreateEstablishmentDto } from '@modules/establishment/dto/create-establishment.dto';
import { UpdateEstablishmentDto } from '@modules/establishment/dto/update-establishment.dto';
import { Establishment } from '@modules/establishment/entities/establishment.entity';
import { EstablishmentController } from '@modules/establishment/establishment.controller';
import {
  EstablishmentService,
  EstablishmentWithMetrics,
} from '@modules/establishment/establishment.service';
import { User, UserRole } from '@modules/users/entities/user.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { Order } from '@/common/pagination/constants/order';
import {
  PageOptionsDto,
  SortField,
} from '@/common/pagination/dto/page-options.dto';

describe('EstablishmentController', () => {
  let controller: EstablishmentController;
  let service: EstablishmentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EstablishmentController],
      providers: [
        {
          provide: EstablishmentService,
          useValue: {
            create: jest.fn(),
            getNearby: jest.fn(),
            getAllEstablishments: jest.fn(),
            getAllFavorites: jest.fn(),
            getEstablishmentByOwner: jest.fn(),
            getEstablishmentById: jest.fn(),
            getAllComments: jest.fn(),
            edit: jest.fn(),
            remove: jest.fn(),
            addFeature: jest.fn(),
            removeFeature: jest.fn(),
            addFavorite: jest.fn(),
            removeFavorite: jest.fn(),
            addModerator: jest.fn(),
            removeModerator: jest.fn(),
            getModerators: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Establishment),
          useValue: {
            findOne: jest.fn(),
            findOneBy: jest.fn(),
          },
        },
        {
          provide: FileUploadService,
          useValue: {
            multerOptions: {},
            getFileUrl: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<EstablishmentController>(EstablishmentController);
    service = module.get<EstablishmentService>(EstablishmentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
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

    const mockUser = { id: 1, name: 'Owner', role: UserRole.OWNER } as User;

    const files = {
      coverPhoto: [{ filename: 'cover.jpg' }] as Express.Multer.File[],
      photos: [{ filename: 'photo1.jpg' }] as Express.Multer.File[],
    };

    it('should create a new establishment with uploaded files', async () => {
      const mockEstablishment = {
        id: 1,
        ...createEstablishmentDto,
        coverPhoto: '/uploads/cover.jpg',
        photos: ['/uploads/photo1.jpg'],
        createdAt: new Date(),
      } as unknown as Establishment;

      jest.spyOn(service, 'create').mockResolvedValue(mockEstablishment);

      const result = await controller.create(
        { ...createEstablishmentDto },
        files,
        mockUser
      );

      expect(result).toEqual(mockEstablishment);
      expect(service.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...createEstablishmentDto,
          coverPhoto: files.coverPhoto[0],
          photos: files.photos,
        }),
        mockUser.id
      );
    });

    it('should create an establishment when files is undefined', async () => {
      const mockEstablishment = {
        id: 1,
        ...createEstablishmentDto,
      } as unknown as Establishment;

      jest.spyOn(service, 'create').mockResolvedValue(mockEstablishment);

      const result = await controller.create(
        { ...createEstablishmentDto },
        undefined as unknown as {
          coverPhoto: Express.Multer.File[];
          photos: Express.Multer.File[];
        },
        mockUser
      );

      expect(result).toEqual(mockEstablishment);
      expect(service.create).toHaveBeenCalledWith(
        createEstablishmentDto,
        mockUser.id
      );
    });

    it('should throw error when service.create fails', async () => {
      jest
        .spyOn(service, 'create')
        .mockRejectedValue(
          new BadRequestException('Failed to create establishment')
        );

      await expect(
        controller.create(createEstablishmentDto, files, mockUser)
      ).rejects.toThrow(BadRequestException);

      expect(service.create).toHaveBeenCalledWith(
        createEstablishmentDto,
        mockUser.id
      );
    });
  });

  describe('getNearby', () => {
    const pageOptionsDto: PageOptionsDto = {
      page: 1,
      take: 10,
      order: Order.ASC,
      sortBy: SortField.WEIGHTED_RATING,
      search: '',
      skip: 0,
    };

    const mockNearby = [
      { id: 1, name: 'Nearby 1', lat: 50.0, lng: 20.0 },
      { id: 2, name: 'Nearby 2', lat: 50.1, lng: 20.1 },
    ] as Establishment[];

    it('should return nearby establishments for an authenticated user', async () => {
      const mockUser = { id: 1, role: UserRole.USER } as User;
      jest.spyOn(service, 'getNearby').mockResolvedValue(mockNearby);

      const result = await controller.getNearby(
        50.0,
        20.0,
        10,
        pageOptionsDto,
        mockUser
      );

      expect(result).toEqual(mockNearby);
      expect(service.getNearby).toHaveBeenCalledWith(
        50.0,
        20.0,
        10,
        pageOptionsDto,
        mockUser.id
      );
    });

    it('should return nearby establishments when user is not provided', async () => {
      jest.spyOn(service, 'getNearby').mockResolvedValue(mockNearby);

      const result = await controller.getNearby(
        50.0,
        20.0,
        10,
        pageOptionsDto,
        undefined
      );

      expect(result).toEqual(mockNearby);
      expect(service.getNearby).toHaveBeenCalledWith(
        50.0,
        20.0,
        10,
        pageOptionsDto,
        undefined
      );
    });

    it('should throw error when service.getNearby fails', async () => {
      jest
        .spyOn(service, 'getNearby')
        .mockRejectedValue(new BadRequestException('Invalid coordinates'));

      await expect(
        controller.getNearby(50.0, 20.0, 10, pageOptionsDto, undefined)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getAllEstablishments', () => {
    const mockEstablishments = [
      {
        id: 1,
        name: 'Establishment 1',
        address: 'City 1, Street 1 1',
        totalSeats: 50,
        commentsCount: 0,
        avgRating: 0,
        weightedRating: 0,
      },
      {
        id: 2,
        name: 'Establishment 2',
        address: 'City 2, Street 2 2',
        totalSeats: 50,
        commentsCount: 0,
        avgRating: 0,
        weightedRating: 0,
      },
    ] as unknown as EstablishmentWithMetrics[];

    const mockPageDto = {
      data: mockEstablishments,
      meta: {
        itemCount: 2,
        page: 1,
        take: 10,
        pageCount: 1,
        hasPreviousPage: false,
        hasNextPage: false,
      },
    } as PageDto<EstablishmentWithMetrics>;

    const pageOptionsDto: PageOptionsDto = {
      page: 1,
      take: 10,
      order: Order.DESC,
      sortBy: SortField.WEIGHTED_RATING,
      search: '',
      skip: 0,
    };

    it('should return all establishments for unauthenticated user', async () => {
      jest
        .spyOn(service, 'getAllEstablishments')
        .mockResolvedValue(mockPageDto);

      const result = await controller.getAllEstablishments(pageOptionsDto);

      expect(result).toEqual(mockPageDto);
      expect(service.getAllEstablishments).toHaveBeenCalledWith(
        pageOptionsDto,
        undefined
      );
    });

    it('should return all establishments for authenticated user', async () => {
      const mockUser = { id: 1, role: UserRole.USER } as User;
      jest
        .spyOn(service, 'getAllEstablishments')
        .mockResolvedValue(mockPageDto);

      const result = await controller.getAllEstablishments(
        pageOptionsDto,
        mockUser
      );

      expect(result).toEqual(mockPageDto);
      expect(service.getAllEstablishments).toHaveBeenCalledWith(
        pageOptionsDto,
        mockUser.id
      );
    });

    it('should throw error when service.getAllEstablishments fails', async () => {
      jest
        .spyOn(service, 'getAllEstablishments')
        .mockRejectedValue(new BadRequestException());

      await expect(
        controller.getAllEstablishments(pageOptionsDto)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getAllFavorites', () => {
    it('should return favorite establishments for the current user', async () => {
      const mockUser = { id: 1, role: UserRole.USER } as User;
      const mockFavorites = [
        { id: 1, name: 'Favorite 1', isFavorite: true },
        { id: 2, name: 'Favorite 2', isFavorite: true },
      ] as unknown as (Establishment & { isFavorite: boolean })[];

      jest.spyOn(service, 'getAllFavorites').mockResolvedValue(mockFavorites);

      const result = await controller.getAllFavorites(mockUser);

      expect(result).toEqual(mockFavorites);
      expect(service.getAllFavorites).toHaveBeenCalledWith(mockUser.id);
    });

    it('should throw NotFoundException when service.getAllFavorites throws NotFoundException', async () => {
      const mockUser = { id: 99, role: UserRole.USER } as User;
      jest
        .spyOn(service, 'getAllFavorites')
        .mockRejectedValue(new NotFoundException('User 99 not found'));

      await expect(controller.getAllFavorites(mockUser)).rejects.toThrow(
        NotFoundException
      );
      expect(service.getAllFavorites).toHaveBeenCalledWith(99);
    });
  });

  describe('getEstablishmentByOwner', () => {
    it('should return establishments owned by the user', async () => {
      const mockUser = { id: 1, role: UserRole.OWNER } as User;
      const mockEstablishments = [
        { id: 1, name: 'Owner Est 1' },
      ] as Establishment[];

      jest
        .spyOn(service, 'getEstablishmentByOwner')
        .mockResolvedValue(mockEstablishments);

      const result = await controller.getEstablishmentByOwner(mockUser);

      expect(result).toEqual(mockEstablishments);
      expect(service.getEstablishmentByOwner).toHaveBeenCalledWith(mockUser.id);
    });

    it('should throw NotFoundException when owner has no establishments', async () => {
      const mockUser = { id: 1, role: UserRole.OWNER } as User;
      jest
        .spyOn(service, 'getEstablishmentByOwner')
        .mockRejectedValue(
          new NotFoundException('Establishment for owner 1 not found')
        );

      await expect(
        controller.getEstablishmentByOwner(mockUser)
      ).rejects.toThrow(NotFoundException);
      expect(service.getEstablishmentByOwner).toHaveBeenCalledWith(1);
    });
  });

  describe('getEstablishmentById', () => {
    const mockEstablishment = {
      id: 1,
      name: 'Test Establishment',
      isFavorite: false,
    } as unknown as Establishment & { isFavorite: boolean };

    it('should return establishment by numeric ID without user', async () => {
      jest
        .spyOn(service, 'getEstablishmentById')
        .mockResolvedValue(mockEstablishment);

      const result = await controller.getEstablishmentById('1');

      expect(result).toEqual(mockEstablishment);
      expect(service.getEstablishmentById).toHaveBeenCalledWith(1, undefined);
    });

    it('should return establishment by ID with user', async () => {
      const mockUser = { id: 5, role: UserRole.USER } as User;
      jest
        .spyOn(service, 'getEstablishmentById')
        .mockResolvedValue({ ...mockEstablishment, isFavorite: true });

      const result = await controller.getEstablishmentById('1', mockUser);

      expect(result).toEqual({ ...mockEstablishment, isFavorite: true });
      expect(service.getEstablishmentById).toHaveBeenCalledWith(1, 5);
    });

    it('should throw NotFoundException when establishment does not exist', async () => {
      jest
        .spyOn(service, 'getEstablishmentById')
        .mockRejectedValue(new NotFoundException('Establishment 99 not found'));

      await expect(controller.getEstablishmentById('99')).rejects.toThrow(
        NotFoundException
      );
      expect(service.getEstablishmentById).toHaveBeenCalledWith(99, undefined);
    });
  });

  describe('getAllComments', () => {
    it('should return all comments for an establishment', async () => {
      const mockComments = [
        { id: 1, text: 'Great!', rating: 5 },
        { id: 2, text: 'Nice!', rating: 4 },
      ] as unknown as Comment[];

      jest.spyOn(service, 'getAllComments').mockResolvedValue(mockComments);

      const result = await controller.getAllComments('1');

      expect(result).toEqual(mockComments);
      expect(service.getAllComments).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when establishment not found', async () => {
      jest
        .spyOn(service, 'getAllComments')
        .mockRejectedValue(new NotFoundException('Establishment 99 not found'));

      await expect(controller.getAllComments('99')).rejects.toThrow(
        NotFoundException
      );
      expect(service.getAllComments).toHaveBeenCalledWith(99);
    });
  });

  describe('update', () => {
    const updateEstablishmentDto: UpdateEstablishmentDto = {
      name: 'Updated Establishment',
      description: 'Updated Description',
    };

    const files = {
      coverPhoto: [{ filename: 'new-cover.jpg' }] as Express.Multer.File[],
      photos: [{ filename: 'new-photo.jpg' }] as Express.Multer.File[],
    };

    it('should update establishment with uploaded files', async () => {
      const mockUpdated = {
        id: 1,
        ...updateEstablishmentDto,
        coverPhoto: '/uploads/new-cover.jpg',
        photos: ['/uploads/new-photo.jpg'],
      } as unknown as Establishment;

      jest.spyOn(service, 'edit').mockResolvedValue(mockUpdated);

      const result = await controller.update('1', files, {
        ...updateEstablishmentDto,
      });

      expect(result).toEqual(mockUpdated);
      expect(service.edit).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          ...updateEstablishmentDto,
          coverPhoto: files.coverPhoto[0],
          photos: files.photos,
        })
      );
    });

    it('should update establishment without uploaded files', async () => {
      const mockUpdated = {
        id: 1,
        ...updateEstablishmentDto,
      } as unknown as Establishment;

      jest.spyOn(service, 'edit').mockResolvedValue(mockUpdated);

      const result = await controller.update(
        '1',
        {},
        { ...updateEstablishmentDto }
      );

      expect(result).toEqual(mockUpdated);
      expect(service.edit).toHaveBeenCalledWith(1, updateEstablishmentDto);
    });

    it('should throw NotFoundException when establishment not found', async () => {
      jest
        .spyOn(service, 'edit')
        .mockRejectedValue(new NotFoundException('Establishment 99 not found'));

      await expect(
        controller.update('99', {}, updateEstablishmentDto)
      ).rejects.toThrow(NotFoundException);
      expect(service.edit).toHaveBeenCalledWith(99, updateEstablishmentDto);
    });
  });

  describe('remove', () => {
    it('should delete establishment successfully', async () => {
      jest.spyOn(service, 'remove').mockResolvedValue(undefined);

      const result = await controller.remove('1');

      expect(result).toBeUndefined();
      expect(service.remove).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when establishment not found', async () => {
      jest
        .spyOn(service, 'remove')
        .mockRejectedValue(new NotFoundException('Establishment 99 not found'));

      await expect(controller.remove('99')).rejects.toThrow(NotFoundException);
      expect(service.remove).toHaveBeenCalledWith(99);
    });
  });

  describe('addFeature', () => {
    it('should add a feature to an establishment', async () => {
      const mockEstablishment = {
        id: 1,
        name: 'Test',
        features: [{ id: 2, name: 'Wi-Fi' }],
      } as Establishment;

      jest.spyOn(service, 'addFeature').mockResolvedValue(mockEstablishment);

      const result = await controller.addFeature('1', '2');

      expect(result).toEqual(mockEstablishment);
      expect(service.addFeature).toHaveBeenCalledWith(1, 2);
    });

    it('should throw BadRequestException when feature already added', async () => {
      jest
        .spyOn(service, 'addFeature')
        .mockRejectedValue(
          new BadRequestException('Feature already added to this establishment')
        );

      await expect(controller.addFeature('1', '2')).rejects.toThrow(
        BadRequestException
      );
      expect(service.addFeature).toHaveBeenCalledWith(1, 2);
    });
  });

  describe('removeFeature', () => {
    it('should remove a feature from an establishment', async () => {
      const mockEstablishment = {
        id: 1,
        name: 'Test',
        features: [],
      } as unknown as Establishment;

      jest.spyOn(service, 'removeFeature').mockResolvedValue(mockEstablishment);

      const result = await controller.removeFeature('1', '2');

      expect(result).toEqual(mockEstablishment);
      expect(service.removeFeature).toHaveBeenCalledWith(1, 2);
    });

    it('should throw NotFoundException when feature not found in establishment', async () => {
      jest
        .spyOn(service, 'removeFeature')
        .mockRejectedValue(
          new NotFoundException('Feature 99 not found in this establishment')
        );

      await expect(controller.removeFeature('1', '99')).rejects.toThrow(
        NotFoundException
      );
      expect(service.removeFeature).toHaveBeenCalledWith(1, 99);
    });
  });

  describe('addFavorite', () => {
    it('should add establishment to user favorites', async () => {
      const mockUser = { id: 1, role: UserRole.USER } as User;
      const mockFavorites = [1, 2];

      jest.spyOn(service, 'addFavorite').mockResolvedValue(mockFavorites);

      const result = await controller.addFavorite('2', mockUser);

      expect(result).toEqual(mockFavorites);
      expect(service.addFavorite).toHaveBeenCalledWith(mockUser.id, 2);
    });

    it('should throw NotFoundException if establishment not found', async () => {
      const mockUser = { id: 1, role: UserRole.USER } as User;
      jest
        .spyOn(service, 'addFavorite')
        .mockRejectedValue(new NotFoundException('Establishment 99 not found'));

      await expect(controller.addFavorite('99', mockUser)).rejects.toThrow(
        NotFoundException
      );
      expect(service.addFavorite).toHaveBeenCalledWith(mockUser.id, 99);
    });
  });

  describe('removeFavorite', () => {
    it('should remove establishment from user favorites', async () => {
      const mockUser = { id: 1, role: UserRole.USER } as User;
      jest.spyOn(service, 'removeFavorite').mockResolvedValue(undefined);

      const result = await controller.removeFavorite('2', mockUser);

      expect(result).toBeUndefined();
      expect(service.removeFavorite).toHaveBeenCalledWith(mockUser.id, 2);
    });

    it('should throw BadRequestException if establishment not in user favorites', async () => {
      const mockUser = { id: 1, role: UserRole.USER } as User;
      jest
        .spyOn(service, 'removeFavorite')
        .mockRejectedValue(
          new BadRequestException(
            'User 1 does not have this establishment as favorite'
          )
        );

      await expect(controller.removeFavorite('2', mockUser)).rejects.toThrow(
        BadRequestException
      );
      expect(service.removeFavorite).toHaveBeenCalledWith(mockUser.id, 2);
    });
  });

  describe('addModerator', () => {
    it('should add a moderator to establishment', async () => {
      const mockCurrentUser = { id: 1, role: UserRole.OWNER } as User;
      const mockEstablishment = {
        id: 1,
        name: 'Test',
        moderators: [{ id: 2, name: 'Mod' }],
      } as unknown as Establishment;

      jest.spyOn(service, 'addModerator').mockResolvedValue(mockEstablishment);

      const result = await controller.addModerator('1', '2', mockCurrentUser);

      expect(result).toEqual(mockEstablishment);
      expect(service.addModerator).toHaveBeenCalledWith(
        1,
        2,
        mockCurrentUser.id
      );
    });

    it('should throw BadRequestException when user is not a moderator', async () => {
      const mockCurrentUser = { id: 1, role: UserRole.OWNER } as User;
      jest
        .spyOn(service, 'addModerator')
        .mockRejectedValue(
          new BadRequestException('User 3 is not a moderator')
        );

      await expect(
        controller.addModerator('1', '3', mockCurrentUser)
      ).rejects.toThrow(BadRequestException);
      expect(service.addModerator).toHaveBeenCalledWith(
        1,
        3,
        mockCurrentUser.id
      );
    });
  });

  describe('removeModerator', () => {
    it('should remove a moderator from establishment', async () => {
      const mockCurrentUser = { id: 1, role: UserRole.OWNER } as User;
      const mockEstablishment = {
        id: 1,
        name: 'Test',
        moderators: [],
      } as unknown as Establishment;

      jest
        .spyOn(service, 'removeModerator')
        .mockResolvedValue(mockEstablishment);

      const result = await controller.removeModerator(
        '1',
        '2',
        mockCurrentUser
      );

      expect(result).toEqual(mockEstablishment);
      expect(service.removeModerator).toHaveBeenCalledWith(
        1,
        2,
        mockCurrentUser.id
      );
    });

    it('should throw BadRequestException when target user is not a moderator of establishment', async () => {
      const mockCurrentUser = { id: 1, role: UserRole.OWNER } as User;
      jest
        .spyOn(service, 'removeModerator')
        .mockRejectedValue(
          new BadRequestException(
            'User 2 is not a moderator of this establishment'
          )
        );

      await expect(
        controller.removeModerator('1', '2', mockCurrentUser)
      ).rejects.toThrow(BadRequestException);
      expect(service.removeModerator).toHaveBeenCalledWith(
        1,
        2,
        mockCurrentUser.id
      );
    });
  });

  describe('getModerators', () => {
    it('should return all moderators for establishment', async () => {
      const mockModerators = [
        {
          id: 2,
          name: 'Mod User 1',
          email: 'mod1@test.com',
          role: UserRole.MODERATOR,
        },
      ];

      jest.spyOn(service, 'getModerators').mockResolvedValue(mockModerators);

      const result = await controller.getModerators('1');

      expect(result).toEqual(mockModerators);
      expect(service.getModerators).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when establishment not found', async () => {
      jest
        .spyOn(service, 'getModerators')
        .mockRejectedValue(new NotFoundException('Establishment 99 not found'));

      await expect(controller.getModerators('99')).rejects.toThrow(
        NotFoundException
      );
      expect(service.getModerators).toHaveBeenCalledWith(99);
    });
  });
});
