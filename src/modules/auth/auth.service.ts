import { CreateAuthDto } from '@modules/auth/dto/create-auth.dto';
import { LoginDto } from '@modules/auth/dto/login.dto';
import { RefreshToken } from '@modules/auth/entities/refresh-token.entity';
import { User, UserRole } from '@modules/users/entities/user.entity';
import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';

import {
  generateAvatarSeed,
  generateAvatarUrl,
} from '@/common/utils/avatar.util';

@Injectable()
export class AuthService {
  private readonly JWT_ACCESS_SECRET: string;
  private readonly JWT_REFRESH_SECRET: string;
  private readonly JWT_ACCESS_EXPIRES_IN: number;
  private readonly JWT_REFRESH_EXPIRES_IN: number;

  constructor(
    private configService: ConfigService,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepo: Repository<RefreshToken>,
    private readonly jwtService: JwtService
  ) {
    this.JWT_ACCESS_SECRET =
      this.configService.getOrThrow<string>('JWT_ACCESS_SECRET');
    this.JWT_REFRESH_SECRET =
      this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');
    this.JWT_ACCESS_EXPIRES_IN = this.configService.getOrThrow<number>(
      'JWT_ACCESS_EXPIRES_IN'
    );
    this.JWT_REFRESH_EXPIRES_IN = this.configService.getOrThrow<number>(
      'JWT_REFRESH_EXPIRES_IN'
    );
  }

  async register(dto: CreateAuthDto) {
    const existing = await this.userRepo.findOne({
      where: [{ email: dto.email }, { phoneNumber: dto.phoneNumber }],
    });
    if (existing) throw new ConflictException('User already exists');

    const avatarSeed = generateAvatarSeed();
    const avatarUrl = generateAvatarUrl(avatarSeed);

    const hash = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({
      ...dto,
      password: hash,
      avatarUrl,
      avatarSeed,
      role: UserRole.USER,
    });
    await this.userRepo.save(user);

    const tokens = await this.getTokens(user.id, user.email, user.role);
    return { user, ...tokens };
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.getTokens(user.id, user.email, user.role);
    return { user, ...tokens };
  }

  async getTokens(userId: number, email: string, role: UserRole) {
    const payload = { id: userId, email, role };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.JWT_ACCESS_SECRET,
      expiresIn: Number(this.JWT_ACCESS_EXPIRES_IN) || 900,
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.JWT_REFRESH_SECRET,
      expiresIn: Number(this.JWT_REFRESH_EXPIRES_IN) || 604800,
    });

    const hashedToken = await bcrypt.hash(refreshToken, 10);

    const expiresAt = new Date();
    const expiresInDays = Number(this.JWT_REFRESH_EXPIRES_IN) || 604800;
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    await this.refreshTokenRepo.delete({ user: { id: userId } });

    const refreshTokenEntity = this.refreshTokenRepo.create({
      hashedToken,
      user: { id: userId },
      expiresAt,
    });
    await this.refreshTokenRepo.save(refreshTokenEntity);

    return { accessToken, refreshToken };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.JWT_REFRESH_SECRET,
      });
      return this.getTokens(payload.id, payload.email, payload.role);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async changeRole(id: number, role: UserRole) {
    const user = await this.userRepo.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    user.role = role;
    await this.userRepo.save(user);

    const tokens = await this.getTokens(user.id, user.email, user.role);

    return { user, ...tokens, message: 'Role updated' };
  }

  async logout(userId: number) {
    await this.refreshTokenRepo.delete({ user: { id: userId } });
    return { message: 'Logged out' };
  }
}
