import { Roles } from '@common/decorator/roles.decorator';
import { JwtAuthGuard } from '@common/guard/jwt-auth.guard';
import { RolesGuard } from '@common/guard/jwt-roles.guard';
import { AvatarUploadInterceptor } from '@common/interceptor/avatar-upload.interceptor';
import { PageOptionsDto } from '@common/pagination/dto/page-options.dto';
import { PageDto } from '@common/pagination/dto/page.dto';
import { AdminUpdateUserDto } from '@modules/users/dto/admin-update-user.dto';
import { UpdateUserDto } from '@modules/users/dto/update-user.dto';
import { User, UserRole } from '@modules/users/entities/user.entity';
import { UsersService } from '@modules/users/users.service';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiOkResponse({ description: 'Current user profile retrieved' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  getCurrentUser(@Request() req) {
    return this.usersService.getCurrentUser(req.user.id);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AvatarUploadInterceptor)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'John Doe' },
        password: { type: 'string', example: 'Password123' },
        avatar: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOkResponse({ description: 'Profile updated successfully' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  updateCurrentUser(
    @Request() req,
    @Body() updateUserDto: UpdateUserDto,
    @UploadedFile() avatarFile?: Express.Multer.File
  ) {
    return this.usersService.updateCurrentUser(
      req.user.id,
      updateUserDto,
      avatarFile
    );
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @UseInterceptors(AvatarUploadInterceptor)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update any user by ID including role (admin only)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'John Doe' },
        password: { type: 'string', example: 'Password123' },
        role: { type: 'string', enum: Object.values(UserRole) },
        avatar: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOkResponse({ description: 'User updated successfully' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  @ApiNotFoundResponse({ description: 'User not found' })
  adminUpdateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() adminUpdateUserDto: AdminUpdateUserDto,
    @UploadedFile() avatarFile?: Express.Multer.File
  ) {
    return this.usersService.adminUpdateUser(
      id,
      adminUpdateUserDto,
      avatarFile
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all users (admin only)' })
  @ApiOkResponse({ description: 'Users retrieved successfully' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  findAll(@Query() pageOptionsDto: PageOptionsDto): Promise<PageDto<User>> {
    return this.usersService.findAll(pageOptionsDto);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiOkResponse({ description: 'User retrieved successfully' })
  @ApiNotFoundResponse({ description: 'User not found' })
  getUserById(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.getUserById(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete user by ID (admin only)' })
  @ApiOkResponse({ description: 'User deleted successfully' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  deleteUserById(@Param('id') id: number) {
    return this.usersService.deleteUser(id);
  }
}
