import { FeatureUploadInterceptor } from '@common/interceptor/feature-upload.interceptor';
import { CreateFeatureDto } from '@modules/features/dto/create-feature.dto';
import { UpdateFeatureDto } from '@modules/features/dto/update-feature.dto';
import { FeaturesService } from '@modules/features/features.service';
import { UserRole } from '@modules/users/entities/user.entity';
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import {
  ApiConsumes,
  ApiBody,
  ApiOperation,
  ApiTags,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';

import { Roles } from '@/common/decorator/roles.decorator';
import { JwtAuthGuard } from '@/common/guard/jwt-auth.guard';

@ApiTags('features')
@Controller('features')
export class FeaturesController {
  constructor(private readonly featuresService: FeaturesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @UseInterceptors(FeatureUploadInterceptor)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create a new feature with optional image' })
  @ApiBody({
    description: 'Feature data with optional image',
    schema: {
      type: 'object',
      required: ['name'],
      properties: {
        name: {
          type: 'string',
          example: 'WiFi',
          description: 'Name of the feature',
        },
        image: {
          type: 'string',
          format: 'binary',
          description: 'Feature icon image (optional)',
        },
      },
    },
  })
  @ApiOkResponse({ description: 'Feature created successfully' })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  create(
    @Body() createFeatureDto: CreateFeatureDto,
    @UploadedFile() image?: Express.Multer.File
  ) {
    return this.featuresService.create(createFeatureDto, image);
  }

  @Get()
  @ApiOperation({ summary: 'Get all features' })
  @ApiOkResponse({ description: 'Returns all features' })
  findAll() {
    return this.featuresService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get feature by ID' })
  @ApiOkResponse({ description: 'Returns the feature' })
  @ApiNotFoundResponse({ description: 'Feature not found' })
  findOne(@Param('id') id: string) {
    return this.featuresService.findOne(+id);
  }

  @Patch(':id')
  @UseInterceptors(FeatureUploadInterceptor)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update feature' })
  @ApiBody({
    description: 'Update feature data',
    schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          example: 'WiFi',
          description: 'Name of the feature (optional)',
        },
        image: {
          type: 'string',
          format: 'binary',
          description: 'New feature icon image (optional)',
        },
      },
    },
  })
  @ApiOkResponse({ description: 'Feature updated successfully' })
  @ApiNotFoundResponse({ description: 'Feature not found' })
  update(
    @Param('id') id: string,
    @Body() updateFeatureDto: UpdateFeatureDto,
    @UploadedFile() image?: Express.Multer.File
  ) {
    return this.featuresService.update(+id, updateFeatureDto, image);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete feature' })
  @ApiOkResponse({ description: 'Feature deleted successfully' })
  @ApiNotFoundResponse({ description: 'Feature not found' })
  remove(@Param('id') id: string) {
    return this.featuresService.remove(+id);
  }
}
