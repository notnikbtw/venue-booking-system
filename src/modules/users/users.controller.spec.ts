import { PageOptionsDto } from '@common/pagination/dto/page-options.dto';
import { PageDto } from '@common/pagination/dto/page.dto';
import { FileUploadService } from '@common/services/file-upload.service';
import { User } from '@modules/users/entities/user.entity';
import { UsersController } from '@modules/users/users.controller';
import { UsersService } from '@modules/users/users.service';
import { Test, TestingModule } from '@nestjs/testing';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            getCurrentUser: jest.fn(),
            updateCurrentUser: jest.fn(),
            adminUpdateUser: jest.fn(),
            findAll: jest.fn(),
            getUserById: jest.fn(),
            deleteUser: jest.fn(),
          },
        },
        {
          provide: FileUploadService,
          useValue: {
            uploadFile: jest.fn(),
            deleteFile: jest.fn(),
            getFileUrl: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('Get current user', () => {
    it('should return the current user', async () => {
      const mockUser = { id: 1, name: 'User 1' };
      jest.spyOn(service, 'getCurrentUser').mockResolvedValue(mockUser as User);
      const req = { user: { id: 1 } };
      const result = await controller.getCurrentUser(req);
      expect(result).toEqual(mockUser);
      expect(service.getCurrentUser).toHaveBeenCalledWith(1);
    });
  });

  describe('Update current user', () => {
    it('should update the current user', async () => {
      const mockUser = { id: 1, name: 'User 1' };
      jest
        .spyOn(service, 'updateCurrentUser')
        .mockResolvedValue(mockUser as User);
      const req = { user: { id: 1 } };
      const result = await controller.updateCurrentUser(req, {});
      expect(result).toEqual(mockUser);
      expect(service.updateCurrentUser).toHaveBeenCalledWith(1, {}, undefined);
    });
  });

  describe('Admin update user', () => {
    it('should update the user', async () => {
      const mockUser = { id: 1, name: 'User 1' };
      jest
        .spyOn(service, 'adminUpdateUser')
        .mockResolvedValue(mockUser as User);
      const result = await controller.adminUpdateUser(1, {});
      expect(result).toEqual(mockUser);
      expect(service.adminUpdateUser).toHaveBeenCalledWith(1, {}, undefined);
    });
  });

  describe('Find all users', () => {
    it('should return all users', async () => {
      const mockUsers = [{ id: 1, name: 'User 1' }];
      const pageOptionsDto = { page: 1, take: 10 } as PageOptionsDto;
      const pageDto = {
        data: mockUsers,
        meta: {
          page: 1,
          take: 10,
          itemCount: 1,
          pageCount: 1,
          hasPreviousPage: false,
          hasNextPage: false,
        },
      };

      jest
        .spyOn(service, 'findAll')
        .mockResolvedValue(pageDto as PageDto<User>);
      const result = await controller.findAll(pageOptionsDto);
      expect(result).toEqual(pageDto);
      expect(service.findAll).toHaveBeenCalledWith(pageOptionsDto);
    });
  });

  describe('Get user by ID', () => {
    it('should return the user', async () => {
      const mockUser = { id: 1, name: 'User 1' };
      jest.spyOn(service, 'getUserById').mockResolvedValue(mockUser as User);
      const result = await controller.getUserById(1);
      expect(result).toEqual(mockUser);
      expect(service.getUserById).toHaveBeenCalledWith(1);
    });
  });

  describe('Delete user by ID', () => {
    it('should delete the user', async () => {
      const mockUser = { id: 1, name: 'User 1' };
      jest.spyOn(service, 'deleteUser').mockResolvedValue(mockUser as User);
      const result = await controller.deleteUserById(1);
      expect(result).toEqual(mockUser);
      expect(service.deleteUser).toHaveBeenCalledWith(1);
    });
  });
});
