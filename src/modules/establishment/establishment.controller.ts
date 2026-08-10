import { Roles } from '@common/decorator/roles.decorator';
import { CurrentUser } from '@common/decorator/user.decorator';
import { EstablishmentOwnerGuard } from '@common/guard/establishment-owner.guard';
import { JwtAuthGuard } from '@common/guard/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '@common/guard/jwt-optional-auth.guard';
import { RolesGuard } from '@common/guard/jwt-roles.guard';
import { FileFieldsUploadInterceptor } from '@common/interceptor/file-fields-upload.interceptor';
import { PageOptionsDto } from '@common/pagination/dto/page-options.dto';
import { PageDto } from '@common/pagination/dto/page.dto';
import { CreateEstablishmentDto } from '@modules/establishment/dto/create-establishment.dto';
import { UpdateEstablishmentDto } from '@modules/establishment/dto/update-establishment.dto';
import { Establishment } from '@modules/establishment/entities/establishment.entity';
import { EstablishmentService } from '@modules/establishment/establishment.service';
import { User, UserRole } from '@modules/users/entities/user.entity';
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  UseInterceptors,
  UploadedFiles,
  ParseFloatPipe,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@Controller('establishment')
export class EstablishmentController {
  constructor(private readonly establishmentService: EstablishmentService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create establishment' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileFieldsUploadInterceptor)
  @ApiCreatedResponse({ description: 'Create success', type: Establishment })
  @ApiBadRequestResponse({ description: 'Bad request data' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  create(
    @Body() createEstablishmentDto: CreateEstablishmentDto,
    @UploadedFiles()
    files: {
      coverPhoto: Express.Multer.File[];
      photos: Express.Multer.File[];
    },
    @CurrentUser() user: User
  ) {
    if (files?.coverPhoto) {
      createEstablishmentDto.coverPhoto = files.coverPhoto[0];
    }

    if (files?.photos) {
      createEstablishmentDto.photos = files.photos;
    }

    return this.establishmentService.create(createEstablishmentDto, user.id);
  }

  @Get('nearby')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Find nearby establishments' })
  @ApiOkResponse({ description: 'List of all establishments', type: PageDto })
  async getNearby(
    @Query('lat', ParseFloatPipe) lat: number,
    @Query('lng', ParseFloatPipe) lng: number,
    @Query('radius', ParseFloatPipe) radius: number,
    @Query() pageOptionsDto: PageOptionsDto,
    @CurrentUser() user?: User
  ) {
    return this.establishmentService.getNearby(
      lat,
      lng,
      radius,
      pageOptionsDto,
      user?.id
    );
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all establishments' })
  @ApiOkResponse({ description: 'List of all establishments', type: PageDto })
  getAllEstablishments(
    @Query() pageOptionsDto: PageOptionsDto,
    @CurrentUser() user?: User
  ): Promise<PageDto<Establishment>> {
    return this.establishmentService.getAllEstablishments(
      pageOptionsDto,
      user?.id
    );
  }

  @Get('favorites')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all favorite establishments for the current user',
  })
  @ApiOkResponse({
    description: 'Favorite establishments retrieved successfully',
  })
  @ApiBadRequestResponse({ description: 'Invalid id' })
  @ApiNotFoundResponse({ description: 'Favorites not found' })
  getAllFavorites(@CurrentUser() user: User) {
    return this.establishmentService.getAllFavorites(user.id);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Get current owner establishments' })
  @ApiOkResponse({
    description: 'Establishments details',
    type: [Establishment],
  })
  @ApiNotFoundResponse({ description: 'Establishments not found' })
  getEstablishmentByOwner(@CurrentUser() user: User) {
    return this.establishmentService.getEstablishmentByOwner(user.id);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get establishment by ID' })
  @ApiOkResponse({ description: 'Establishment details', type: Establishment })
  @ApiNotFoundResponse({ description: 'Establishment not found' })
  getEstablishmentById(@Param('id') id: string, @CurrentUser() user?: User) {
    return this.establishmentService.getEstablishmentById(+id, user?.id);
  }

  @Get(':id/comments')
  @ApiOperation({ summary: 'Get all comments from establishment' })
  @ApiOkResponse({ description: 'Comments retrieved successfully' })
  @ApiNotFoundResponse({ description: 'Establishment not found' })
  getAllComments(@Param('id', ParseIntPipe) id: number) {
    return this.establishmentService.getAllComments(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, EstablishmentOwnerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update establishment information' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileFieldsUploadInterceptor)
  @ApiOkResponse({
    description: 'Establishment updated successfully',
    type: Establishment,
  })
  @ApiBadRequestResponse({ description: 'Invalid id' })
  update(
    @Param('id') id: string,
    @UploadedFiles()
    files: {
      coverPhoto?: Express.Multer.File[];
      photos?: Express.Multer.File[];
    },
    @Body() updateEstablishmentDto: UpdateEstablishmentDto
  ) {
    if (files.coverPhoto) {
      updateEstablishmentDto.coverPhoto = files.coverPhoto[0];
    }

    if (files.photos) {
      updateEstablishmentDto.photos = files.photos;
    }

    return this.establishmentService.edit(+id, updateEstablishmentDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, EstablishmentOwnerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete establishment' })
  @ApiBadRequestResponse({ description: 'Invalid id' })
  remove(@Param('id') id: string) {
    return this.establishmentService.remove(+id);
  }

  @Post(':id/features/:featureId')
  @UseGuards(JwtAuthGuard, EstablishmentOwnerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a single feature to establishment' })
  @ApiOkResponse({
    description: 'Feature added successfully',
    type: Establishment,
  })
  @ApiBadRequestResponse({ description: 'Invalid id or feature not found' })
  @ApiNotFoundResponse({ description: 'Establishment not found' })
  addFeature(@Param('id') id: string, @Param('featureId') featureId: string) {
    return this.establishmentService.addFeature(+id, +featureId);
  }

  @Delete(':id/features/:featureId')
  @UseGuards(JwtAuthGuard, EstablishmentOwnerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a single feature from establishment' })
  @ApiOkResponse({
    description: 'Feature removed successfully',
    type: Establishment,
  })
  @ApiBadRequestResponse({ description: 'Invalid id' })
  @ApiNotFoundResponse({ description: 'Establishment or feature not found' })
  removeFeature(
    @Param('id') id: string,
    @Param('featureId') featureId: string
  ) {
    return this.establishmentService.removeFeature(+id, +featureId);
  }

  @Post(':id/favorite')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add establishment to user favorites' })
  @ApiCreatedResponse({ description: 'Establishment added to favorites' })
  @ApiBadRequestResponse({ description: 'Invalid id' })
  @ApiNotFoundResponse({ description: 'Establishment not found' })
  addFavorite(@Param('id') id: string, @CurrentUser() user: User) {
    return this.establishmentService.addFavorite(user.id, +id);
  }

  @Delete(':id/favorite')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove establishment from user favorites' })
  @ApiOkResponse({ description: 'Establishment removed from favorites' })
  @ApiBadRequestResponse({ description: 'Invalid id' })
  @ApiNotFoundResponse({ description: 'Establishment not found' })
  removeFavorite(@Param('id') id: string, @CurrentUser() user: User) {
    return this.establishmentService.removeFavorite(user.id, +id);
  }

  @Post(':id/moderators/:userId')
  @UseGuards(JwtAuthGuard, EstablishmentOwnerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a moderator to establishment' })
  @ApiCreatedResponse({
    description: 'Moderator added successfully',
    type: Establishment,
  })
  @ApiBadRequestResponse({ description: 'Invalid id or user not found' })
  @ApiNotFoundResponse({ description: 'Establishment not found' })
  addModerator(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser() currentUser: User
  ) {
    return this.establishmentService.addModerator(+id, +userId, currentUser.id);
  }

  @Delete(':id/moderators/:userId')
  @UseGuards(JwtAuthGuard, EstablishmentOwnerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a moderator from establishment' })
  @ApiOkResponse({
    description: 'Moderator removed successfully',
    type: Establishment,
  })
  @ApiBadRequestResponse({ description: 'Invalid id' })
  @ApiNotFoundResponse({ description: 'Establishment not found' })
  removeModerator(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser() currentUser: User
  ) {
    return this.establishmentService.removeModerator(
      +id,
      +userId,
      currentUser.id
    );
  }

  @Get(':id/moderators')
  @ApiOperation({ summary: 'Get all moderators of establishment' })
  @ApiOkResponse({
    description: 'Moderators retrieved successfully',
    type: [User],
  })
  @ApiBadRequestResponse({ description: 'Invalid id' })
  @ApiNotFoundResponse({ description: 'Establishment not found' })
  getModerators(@Param('id') id: string) {
    return this.establishmentService.getModerators(+id);
  }
}
