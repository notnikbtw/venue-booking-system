import { AuthController } from '@modules/auth/auth.controller';
import { AuthService } from '@modules/auth/auth.service';
import { User, UserRole } from '@modules/users/entities/user.entity';
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
            refreshToken: jest.fn(),
            changeRole: jest.fn(),
            logout: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    const createAuthDto = {
      name: 'User 1',
      email: 'email@example.com',
      password: 'password',
      phoneNumber: '1234567890',
    };

    it('should create a new user', async () => {
      const mockResponse = {
        user: {
          id: 1,
          role: UserRole.USER,
        } as User,
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
      };

      jest.spyOn(service, 'register').mockResolvedValue(mockResponse);
      const result = await controller.create(createAuthDto);
      expect(result).toEqual(mockResponse);
      expect(service.register).toHaveBeenCalledWith(createAuthDto);
    });

    it('should throw an error when service.register fails', async () => {
      jest
        .spyOn(service, 'register')
        .mockRejectedValue(new BadRequestException());
      await expect(controller.create(createAuthDto)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('login', () => {
    const loginAuthDto = {
      email: 'email@example.com',
      password: 'password',
    };

    it('should login user', async () => {
      const mockResponse = {
        user: {
          id: 1,
          role: UserRole.USER,
        } as User,
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
      };

      jest.spyOn(service, 'login').mockResolvedValue(mockResponse);
      const result = await controller.login(loginAuthDto);
      expect(result).toEqual(mockResponse);
      expect(service.login).toHaveBeenCalledWith(loginAuthDto);
    });

    it('should throw an error when service.login fails', async () => {
      jest.spyOn(service, 'login').mockRejectedValue(new BadRequestException());
      await expect(controller.login(loginAuthDto)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('refresh token', () => {
    const refreshTokenDto = {
      refreshToken: 'refresh_token',
    };

    it('should refresh token', async () => {
      const mockResponse = {
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
      };

      jest.spyOn(service, 'refreshToken').mockResolvedValue(mockResponse);
      const result = await controller.refresh(refreshTokenDto);
      expect(result).toEqual(mockResponse);
      expect(service.refreshToken).toHaveBeenCalledWith(
        refreshTokenDto.refreshToken
      );
    });

    it('should throw an error when service.refreshToken fails', async () => {
      jest
        .spyOn(service, 'refreshToken')
        .mockRejectedValue(new BadRequestException());
      await expect(controller.refresh(refreshTokenDto)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('change role', () => {
    const changeRoleDto = {
      role: UserRole.MODERATOR,
    };

    const userId = '1';

    it('should change user role', async () => {
      const mockResponse = {
        user: {
          id: 1,
          role: UserRole.MODERATOR,
        } as User,
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
        message: 'Role updated',
      };

      jest.spyOn(service, 'changeRole').mockResolvedValue(mockResponse);
      const result = await controller.changeRole(userId, changeRoleDto);
      expect(result).toEqual(mockResponse);
      expect(service.changeRole).toHaveBeenCalledWith(
        Number(userId),
        changeRoleDto.role
      );
    });

    it('should throw an error when service.changeRole fails', async () => {
      jest
        .spyOn(service, 'changeRole')
        .mockRejectedValue(new BadRequestException());
      await expect(
        controller.changeRole(userId, changeRoleDto)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('logout', () => {
    const req = { user: { id: 1 } };

    it('should logout user', async () => {
      const mockResponse = {
        message: 'Logged out',
      };

      jest.spyOn(service, 'logout').mockResolvedValue(mockResponse);
      const result = await controller.logout(req);
      expect(result).toEqual(mockResponse);
      expect(service.logout).toHaveBeenCalledWith(req.user.id);
    });

    it('should throw an error when service.logout fails', async () => {
      jest
        .spyOn(service, 'logout')
        .mockRejectedValue(new BadRequestException());
      await expect(controller.logout(req)).rejects.toThrow(BadRequestException);
    });
  });
});
