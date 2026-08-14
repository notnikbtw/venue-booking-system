import { FileUploadService } from '@common/services/file-upload.service';
import { RefreshToken } from '@modules/auth/entities/refresh-token.entity';
import { User, UserRole } from '@modules/users/entities/user.entity';
import { UsersService } from '@modules/users/users.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PageOptionsDto } from '@/common/pagination/dto/page-options.dto';

describe('UsersService', () => {
  let service: UsersService;
  let usersRepository: Repository<User>;
  let refreshTokenRepository: Repository<RefreshToken>;
  let fileUploadService: FileUploadService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOneBy: jest.fn(),
            findOne: jest.fn(),
            merge: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: {
            delete: jest.fn(),
          },
        },
        {
          provide: FileUploadService,
          useValue: {
            deleteFile: jest.fn(),
            getFileUrl: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    usersRepository = module.get<Repository<User>>(getRepositoryToken(User));
    refreshTokenRepository = module.get<Repository<RefreshToken>>(
      getRepositoryToken(RefreshToken)
    );
    fileUploadService = module.get<FileUploadService>(FileUploadService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  const mockUsers = [
    {
      id: 1,
      name: 'User',
      email: 'email@example.com',
      role: UserRole.MODERATOR,
    } as User,
    {
      id: 2,
      name: 'User 2',
      email: 'email2@example.com',
      role: UserRole.MODERATOR,
    } as User,
  ];

  const queryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    clone: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(mockUsers.length),
    getRawAndEntities: jest.fn().mockResolvedValue({
      entities: mockUsers,
      raw: [],
    }),
  };

  describe('updateCurrentUser', () => {
    it('should update current user', async () => {
      const updatedUser = {
        name: 'Update name',
      };

      const mockUser = {
        id: 1,
        name: 'User',
        email: 'email@example.com',
      } as User;

      const savedUser = {
        ...mockUser,
        ...updatedUser,
      } as User;

      jest.spyOn(usersRepository, 'findOneBy').mockResolvedValue(mockUser);
      jest.spyOn(usersRepository, 'merge').mockReturnValue(savedUser);
      jest.spyOn(usersRepository, 'save').mockResolvedValue(savedUser);
      const result = await service.updateCurrentUser(1, updatedUser);

      expect(usersRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
      expect(usersRepository.merge).toHaveBeenCalledWith(mockUser, updatedUser);
      expect(usersRepository.save).toHaveBeenCalledWith(mockUser);

      expect(result).toEqual(savedUser);
    });

    it('should throw an error if user is not found', async () => {
      jest.spyOn(usersRepository, 'findOneBy').mockResolvedValue(null);
      await expect(
        service.updateCurrentUser(1, { name: 'Update name' })
      ).rejects.toThrow('User not found');
    });
  });

  describe('adminUpdateUser', () => {
    it('should update user', async () => {
      const updatedUser = {
        name: 'Update name',
        role: UserRole.OWNER,
      };

      const mockUser = {
        id: 1,
        name: 'User',
        email: 'email@example.com',
        role: UserRole.MODERATOR,
      } as User;

      const savedUser = {
        ...mockUser,
        ...updatedUser,
      } as User;

      jest.spyOn(usersRepository, 'findOneBy').mockResolvedValue(mockUser);
      jest.spyOn(usersRepository, 'merge').mockReturnValue(savedUser);
      jest.spyOn(usersRepository, 'save').mockResolvedValue(savedUser);

      const result = await service.adminUpdateUser(1, updatedUser);

      expect(usersRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
      expect(usersRepository.merge).toHaveBeenCalledWith(mockUser, updatedUser);
      expect(usersRepository.save).toHaveBeenCalledWith(mockUser);

      expect(result).toEqual(savedUser);
    });

    it('should throw an error if user is not found', async () => {
      jest.spyOn(usersRepository, 'findOneBy').mockResolvedValue(null);
      await expect(
        service.adminUpdateUser(1, { name: 'Update name' })
      ).rejects.toThrow('User 1 not found');
    });
  });

  describe('findAll', () => {
    it('should find all users', async () => {
      const mockUsers = [
        {
          id: 1,
          name: 'User',
          email: 'email@example.com',
          role: UserRole.MODERATOR,
        } as User,
        {
          id: 2,
          name: 'User 2',
          email: 'email2@example.com',
          role: UserRole.MODERATOR,
        } as User,
      ];

      jest
        .spyOn(usersRepository, 'createQueryBuilder')
        .mockReturnValue(queryBuilder as any);

      const pageOptionsDto = {
        page: 1,
        take: 10,
        skip: 0,
        order: 'ASC',
      } as PageOptionsDto;

      const result = await service.findAll(pageOptionsDto);

      expect(result.data).toEqual(mockUsers);
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'users.bookings',
        'bookings'
      );
      expect(queryBuilder.getCount).toHaveBeenCalled();
      expect(queryBuilder.getRawAndEntities).toHaveBeenCalled();
    });

    it('should return filtered users', async () => {
      const mockUsers = [
        {
          id: 1,
          name: 'User',
          email: 'email@example.com',
          role: UserRole.MODERATOR,
        } as User,
        {
          id: 2,
          name: 'User 2',
          email: 'email2@example.com',
          role: UserRole.MODERATOR,
        } as User,
      ];

      jest
        .spyOn(usersRepository, 'createQueryBuilder')
        .mockReturnValue(queryBuilder as any);

      const pageOptionsDto = {
        page: 1,
        take: 10,
        skip: 0,
        order: 'ASC',
        search: 'User',
      } as PageOptionsDto;

      const result = await service.findAll(pageOptionsDto);

      expect(result.data).toEqual(mockUsers);
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'users.bookings',
        'bookings'
      );
      expect(queryBuilder.getCount).toHaveBeenCalled();
      expect(queryBuilder.getRawAndEntities).toHaveBeenCalled();
    });

    it('should return empty array when no users are found', async () => {
      const emptyQueryBuilder = {
        ...queryBuilder,
        getCount: jest.fn().mockResolvedValue(0),
        getRawAndEntities: jest.fn().mockResolvedValue({
          entities: [],
          raw: [],
        }),
      };

      jest
        .spyOn(usersRepository, 'createQueryBuilder')
        .mockReturnValue(emptyQueryBuilder as any);

      const pageOptionsDto = {
        page: 1,
        take: 10,
        skip: 0,
        order: 'ASC',
      } as PageOptionsDto;

      const result = await service.findAll(pageOptionsDto);

      expect(result.data).toEqual([]);
      expect(emptyQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'users.bookings',
        'bookings'
      );
      expect(emptyQueryBuilder.getCount).toHaveBeenCalled();
      expect(emptyQueryBuilder.getRawAndEntities).toHaveBeenCalled();
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user', async () => {
      const mockUser = {
        id: 1,
        name: 'User',
        email: 'email@example.com',
        role: UserRole.USER,
      } as User;

      jest.spyOn(usersRepository, 'findOne').mockResolvedValue(mockUser);

      const result = await service.getCurrentUser(1);

      expect(result).toEqual(mockUser);
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['bookings', 'comments'],
      });
    });

    it('should throw an error if user unauthorized', async () => {
      jest.spyOn(usersRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getCurrentUser(1)).rejects.toThrow('User not found');

      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['bookings', 'comments'],
      });
    });
  });

  describe('getUserById', () => {
    it('should return user when exists', async () => {
      const mockUser = {
        id: 1,
        name: 'User',
        email: 'email@example.com',
        role: UserRole.MODERATOR,
      } as User;

      jest.spyOn(usersRepository, 'findOne').mockResolvedValue(mockUser);

      const result = await service.getUserById(1);

      expect(result).toEqual(mockUser);

      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['comments'],
      });
    });

    it('should throw an error when no user is found', async () => {
      jest.spyOn(usersRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getUserById(1)).rejects.toThrow('User 1 not found');

      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['comments'],
      });
    });
  });

  describe('deleteUser', () => {
    it('should delete user', async () => {
      const mockUser = {
        id: 1,
        name: 'User',
        email: 'email@example.com',
        role: UserRole.MODERATOR,
      } as User;

      jest.spyOn(usersRepository, 'findOneBy').mockResolvedValue(mockUser);
      jest
        .spyOn(refreshTokenRepository, 'delete')
        .mockResolvedValue({ affected: 1, raw: {} });
      jest
        .spyOn(usersRepository, 'delete')
        .mockResolvedValue({ affected: 1, raw: {} });

      const result = await service.deleteUser(1);

      expect(result).toEqual(mockUser);
      expect(usersRepository.findOneBy).toHaveBeenCalledWith({
        id: 1,
      });
      expect(refreshTokenRepository.delete).toHaveBeenCalledWith({
        user: {
          id: 1,
        },
      });
      expect(usersRepository.delete).toHaveBeenCalledWith(1);
    });

    it('should throw an error if user is not found', async () => {
      jest.spyOn(usersRepository, 'findOneBy').mockResolvedValue(null);
      await expect(service.deleteUser(1)).rejects.toThrow('User 1 not found');
    });

    it('should delete user even if no refresh tokens exist', async () => {
      const mockUser = {
        id: 1,
        name: 'User',
        email: 'email@example.com',
        role: UserRole.MODERATOR,
      } as User;

      jest.spyOn(usersRepository, 'findOneBy').mockResolvedValue(mockUser);
      jest
        .spyOn(refreshTokenRepository, 'delete')
        .mockResolvedValue({ affected: 0, raw: {} });
      await expect(service.deleteUser(1)).resolves.toEqual(mockUser);
    });
  });
});
