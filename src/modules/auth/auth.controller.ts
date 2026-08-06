import { Roles } from '@common/decorator/roles.decorator';
import { JwtAuthGuard } from '@common/guard/jwt-auth.guard';
import { RolesGuard } from '@common/guard/jwt-roles.guard';
import { AuthService } from '@modules/auth/auth.service';
import { ChangeRoleDto } from '@modules/auth/dto/change-role.dto';
import { CreateAuthDto } from '@modules/auth/dto/create-auth.dto';
import { LoginDto } from '@modules/auth/dto/login.dto';
import { RefreshTokenDto } from '@modules/auth/dto/refresh-token.dto';
import { UserRole } from '@modules/users/entities/user.entity';
import {
  Controller,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle({ auth: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Create new user' })
  @ApiCreatedResponse({ description: 'User created' })
  @ApiConflictResponse({ description: 'Email already in use' })
  create(@Body() createAuthDto: CreateAuthDto) {
    return this.authService.register(createAuthDto);
  }

  @Post('login')
  @Throttle({ auth: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Login user' })
  @ApiOkResponse({ description: 'Login successful' })
  @ApiNotFoundResponse({ description: 'User not found' })
  login(@Body() loginAuthDto: LoginDto) {
    return this.authService.login(loginAuthDto);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiCreatedResponse({ description: 'Token refreshed successfully' })
  @ApiUnauthorizedResponse({ description: 'Invalid refresh token' })
  refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  @Patch(':id/role')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Change user role (admin only)' })
  @ApiOkResponse({ description: 'Role successfully changed' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiForbiddenResponse({ description: 'Not enough rights' })
  changeRole(@Param('id') id: string, @Body() changeRoleDto: ChangeRoleDto) {
    return this.authService.changeRole(+id, changeRoleDto.role);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout current user' })
  @ApiCreatedResponse({ description: 'Logged out successfully' })
  logout(@Request() req) {
    return this.authService.logout(req.user.id);
  }
}
