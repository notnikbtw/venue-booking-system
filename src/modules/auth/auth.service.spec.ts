import { AuthService } from '@modules/auth/auth.service';
import { CreateAuthDto } from '@modules/auth/dto/create-auth.dto';
import { LoginDto } from '@modules/auth/dto/login.dto';
import { RefreshTokenDto } from '@modules/auth/dto/refresh-token.dto';
import { RefreshToken } from '@modules/auth/entities/refresh-token.entity';
import { User, UserRole } from '@modules/users/entities/user.entity';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';

describe('AuthService', () => {
  let service: AuthService;
  let usersRepository: Repository<User>;
  let refreshTokenRepository: Repository<RefreshToken>;
  let jwtService: JwtService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            findOneBy: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: {
            delete: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => {
              if (key === 'JWT_ACCESS_SECRET') return 'access-secret';
              if (key === 'JWT_REFRESH_SECRET') return 'refresh-secret';
              if (key === 'JWT_ACCESS_EXPIRES_IN') return 900;
              if (key === 'JWT_REFRESH_EXPIRES_IN') return 604800;
              return '';
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersRepository = module.get<Repository<User>>(getRepositoryToken(User));
    refreshTokenRepository = module.get<Repository<RefreshToken>>(
      getRepositoryToken(RefreshToken)
    );
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  const mockRefreshToken = {
    id: 1,
    hashedToken: 'refresh-token',
    expiresAt: new Date(),
    createdAt: new Date(),
    user: {} as User,
  } as RefreshToken;

  describe('register', () => {
    it('should register a new user', async () => {
      const dto: CreateAuthDto = {
        name: 'User 1',
        email: 'test@example.com',
        password: 'password123',
        phoneNumber: '+380966243760',
      };

      const user = {
        id: 1,
        name: 'User 1',
        email: dto.email,
        role: UserRole.USER,
      } as User;

      jest.spyOn(usersRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(usersRepository, 'create').mockReturnValue(user);
      jest.spyOn(usersRepository, 'save').mockResolvedValue(user);

      jest
        .spyOn(jwtService, 'signAsync')
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      jest
        .spyOn(refreshTokenRepository, 'delete')
        .mockResolvedValue({ affected: 1, raw: {} });
      jest
        .spyOn(refreshTokenRepository, 'create')
        .mockReturnValue(mockRefreshToken);

      jest
        .spyOn(refreshTokenRepository, 'save')
        .mockResolvedValue(mockRefreshToken);

      const result = await service.register(dto);

      expect(usersRepository.findOne).toHaveBeenCalled();
      expect(usersRepository.create).toHaveBeenCalled();
      expect(usersRepository.save).toHaveBeenCalled();

      expect(result).toEqual(
        expect.objectContaining({
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
        })
      );
    });

    it('should throw an error if email already exists', async () => {
      const dto: CreateAuthDto = {
        name: 'User 1',
        email: 'test@example.com',
        password: 'password123',
        phoneNumber: '+380966243760',
      };

      const user = {
        id: 1,
        name: 'User 1',
        email: dto.email,
        role: UserRole.USER,
      } as User;

      jest.spyOn(usersRepository, 'findOne').mockResolvedValue(user);
      await expect(service.register(dto)).rejects.toThrow(
        'User already exists'
      );
    });

    it('should throw an error if phone already exist', async () => {
      const dto: CreateAuthDto = {
        name: 'User 1',
        email: 'test@example.com',
        password: 'password123',
        phoneNumber: '+380966243760',
      };

      const user = {
        id: 1,
        name: 'User 1',
        email: dto.email,
        role: UserRole.USER,
      } as User;

      jest.spyOn(usersRepository, 'findOne').mockResolvedValue(user);
      await expect(service.register(dto)).rejects.toThrow(
        'User already exists'
      );
    });
  });

  describe('login', () => {
    it('should login a user', async () => {
      const dto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const user = {
        id: 1,
        name: 'User 1',
        email: dto.email,
        password: bcrypt.hashSync(dto.password, 10),
        role: UserRole.USER,
      } as User;

      jest.spyOn(usersRepository, 'findOne').mockResolvedValue(user);
      jest
        .spyOn(jwtService, 'signAsync')
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      jest
        .spyOn(refreshTokenRepository, 'delete')
        .mockResolvedValue({ affected: 1, raw: {} });
      jest
        .spyOn(refreshTokenRepository, 'create')
        .mockReturnValue(mockRefreshToken);

      jest
        .spyOn(refreshTokenRepository, 'save')
        .mockResolvedValue(mockRefreshToken);

      const result = await service.login(dto);

      expect(usersRepository.findOne).toHaveBeenCalled();
      expect(jwtService.signAsync).toHaveBeenCalled();
      expect(refreshTokenRepository.delete).toHaveBeenCalled();
      expect(refreshTokenRepository.create).toHaveBeenCalled();
      expect(refreshTokenRepository.save).toHaveBeenCalled();

      expect(result).toEqual(
        expect.objectContaining({
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
        })
      );
    });

    it('should throw an error if user not found', async () => {
      const dto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      jest.spyOn(usersRepository, 'findOne').mockResolvedValue(null);
      await expect(service.login(dto)).rejects.toThrow('Invalid credentials');
    });

    it('should throw an error if password is not correct', async () => {
      const dto: LoginDto = {
        email: 'test@example.com',
        password: 'wrong-password',
      };

      const user = {
        id: 1,
        name: 'User 1',
        email: dto.email,
        password: bcrypt.hashSync('correct-password', 10),
        role: UserRole.USER,
      } as User;

      jest.spyOn(usersRepository, 'findOne').mockResolvedValue(user);
      await expect(service.login(dto)).rejects.toThrow('Invalid credentials');
    });
  });

  describe('refresh token', () => {
    it('should refresh a token', async () => {
      const dto: RefreshTokenDto = {
        refreshToken: 'refresh-token',
      };

      const payload = {
        id: 1,
        email: 'test@example.com',
        role: UserRole.USER,
      };

      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(payload);
      jest
        .spyOn(jwtService, 'signAsync')
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      jest
        .spyOn(refreshTokenRepository, 'delete')
        .mockResolvedValue({ affected: 1, raw: {} });
      jest
        .spyOn(refreshTokenRepository, 'create')
        .mockReturnValue(mockRefreshToken);

      jest
        .spyOn(refreshTokenRepository, 'save')
        .mockResolvedValue(mockRefreshToken);

      const result = await service.refreshToken(dto.refreshToken);

      expect(jwtService.verifyAsync).toHaveBeenCalled();
      expect(jwtService.signAsync).toHaveBeenCalled();
      expect(refreshTokenRepository.delete).toHaveBeenCalled();
      expect(refreshTokenRepository.create).toHaveBeenCalled();
      expect(refreshTokenRepository.save).toHaveBeenCalled();

      expect(result).toEqual(
        expect.objectContaining({
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
        })
      );
    });

    it('should throw an error if refresh token is not valid', async () => {
      const dto: RefreshTokenDto = {
        refreshToken: 'refresh-token',
      };

      jest
        .spyOn(jwtService, 'verifyAsync')
        .mockRejectedValue(new Error('Invalid token'));
      await expect(service.refreshToken(dto.refreshToken)).rejects.toThrow(
        'Invalid refresh token'
      );
    });
  });

  describe('change role', () => {
    it('should change role of a user', async () => {
      const userId = 1;
      const role = UserRole.SUPER_ADMIN;
      const user = {
        id: userId,
        name: 'User 1',
        email: 'test@example.com',
        role: UserRole.USER,
      } as User;
      jest.spyOn(usersRepository, 'findOneBy').mockResolvedValue(user);
      jest.spyOn(usersRepository, 'save').mockResolvedValue(user);
      jest
        .spyOn(jwtService, 'signAsync')
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');
      jest
        .spyOn(refreshTokenRepository, 'delete')
        .mockResolvedValue({ affected: 1, raw: {} });
      jest
        .spyOn(refreshTokenRepository, 'create')
        .mockReturnValue(mockRefreshToken);
      jest
        .spyOn(refreshTokenRepository, 'save')
        .mockResolvedValue(mockRefreshToken);
      const result = await service.changeRole(userId, role);
      expect(usersRepository.findOneBy).toHaveBeenCalled();
      expect(usersRepository.save).toHaveBeenCalled();
      expect(jwtService.signAsync).toHaveBeenCalled();
      expect(refreshTokenRepository.delete).toHaveBeenCalled();
      expect(refreshTokenRepository.create).toHaveBeenCalled();
      expect(refreshTokenRepository.save).toHaveBeenCalled();
      expect(result).toEqual(
        expect.objectContaining({
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
        })
      );
    });

    it('should throw an error if user not found', async () => {
      const userId = 1;
      const role = UserRole.SUPER_ADMIN;
      jest.spyOn(usersRepository, 'findOneBy').mockResolvedValue(null);
      await expect(service.changeRole(userId, role)).rejects.toThrow(
        'User 1 not found'
      );
    });
  });

  describe('logout', () => {
    it('should logout a user', async () => {
      const userId = 1;
      jest
        .spyOn(refreshTokenRepository, 'delete')
        .mockResolvedValue({ affected: 1, raw: {} });
      const result = await service.logout(userId);
      expect(result).toEqual({
        message: 'Logged out',
      });
    });
  });
});
