import { PageMetaDto } from '@common/pagination/dto/page-meta.dto';
import {
  PageOptionsDto,
  SortField,
} from '@common/pagination/dto/page-options.dto';
import { PageDto } from '@common/pagination/dto/page.dto';
import { FileUploadService } from '@common/services/file-upload.service';
import { GeocodingService } from '@common/services/geocoding.service';
import { CreateEstablishmentDto } from '@modules/establishment/dto/create-establishment.dto';
import { UpdateEstablishmentDto } from '@modules/establishment/dto/update-establishment.dto';
import { Establishment } from '@modules/establishment/entities/establishment.entity';
import { EstablishmentType } from '@modules/establishment-type/entities/establishment-type.entity';
import { Feature } from '@modules/features/entities/feature.entity';
import { User, UserRole } from '@modules/users/entities/user.entity';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, SelectQueryBuilder } from 'typeorm';

type EstablishmentWithMetrics = Establishment & {
  commentsCount: number;
  avgRating: number;
  weightedRating: number;
  isFavorite?: boolean;
};

@Injectable()
export class EstablishmentService {
  private readonly MINIMUM_COMMENTS: number;
  private readonly GLOBAL_AVERAGE_RATING: number;
  private readonly UPLOADS_ESTABLISHMENTS_PATH: string;

  constructor(
    private configService: ConfigService,
    @InjectRepository(Establishment)
    private establishmentRepository: Repository<Establishment>,
    @InjectRepository(Feature)
    private featureRepository: Repository<Feature>,
    @InjectRepository(EstablishmentType)
    private typeRepository: Repository<EstablishmentType>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private fileUploadService: FileUploadService,
    private readonly geocodingService: GeocodingService
  ) {
    this.MINIMUM_COMMENTS =
      this.configService.getOrThrow<number>('MINIMUM_COMMENTS');
    this.GLOBAL_AVERAGE_RATING = this.configService.getOrThrow<number>(
      'GLOBAL_AVERAGE_RATING'
    );
    this.UPLOADS_ESTABLISHMENTS_PATH = this.configService.getOrThrow<string>(
      'UPLOADS_ESTABLISHMENTS_PATH'
    );
  }

  private async isFavorite(
    userId: number,
    establishmentId: number
  ): Promise<boolean> {
    const result = await this.userRepository
      .createQueryBuilder('user')
      .where('user.id = :userId', { userId })
      .andWhere(':establishmentId = ANY(user.favorites)', { establishmentId })
      .getCount();

    return result > 0;
  }

  async create(createEstablishmentDto: CreateEstablishmentDto, userId: number) {
    const address = `${createEstablishmentDto.city}, ${createEstablishmentDto.street} ${createEstablishmentDto.building}`;

    const coords = await this.geocodingService.geocode(address);

    const establishmentData: Partial<Establishment> = {
      name: createEstablishmentDto.name,
      address,
      locationDetails: {
        city: createEstablishmentDto.city,
        street: createEstablishmentDto.street,
        building: createEstablishmentDto.building,
        zipCode: createEstablishmentDto.zipCode,
      },
      description: createEstablishmentDto.description,
      totalSeats: createEstablishmentDto.totalSeats,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
    };

    if (
      !createEstablishmentDto.coverPhoto ||
      !createEstablishmentDto.photos?.length
    ) {
      throw new BadRequestException(
        'Cover photo and at least one establishment photo are required'
      );
    }

    if (createEstablishmentDto.coverPhoto) {
      establishmentData.coverPhoto = this.fileUploadService.getFileUrl(
        createEstablishmentDto.coverPhoto.filename
      );
    }

    if (createEstablishmentDto.photos) {
      establishmentData.photos = createEstablishmentDto.photos.map(photo =>
        this.fileUploadService.getFileUrl(photo.filename)
      );
    }

    const establishment =
      this.establishmentRepository.create(establishmentData);

    if (createEstablishmentDto.typeId) {
      const type = await this.typeRepository.findOne({
        where: { id: createEstablishmentDto.typeId },
      });

      if (!type) {
        throw new NotFoundException(
          `EstablishmentType ${createEstablishmentDto.typeId} not found`
        );
      }

      establishment.type = type;
    }

    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    establishment.owner = user;

    return this.establishmentRepository.save(establishment);
  }

  async getNearby(
    lat: number,
    lng: number,
    radiusKm: number,
    pageOptionsDto: PageOptionsDto,
    userId?: number
  ) {
    const distance = `
      6371 * acos(
        cos(radians(:lat)) * cos(radians(e.lat)) *
        cos(radians(e.lng) - radians(:lng)) +
        sin(radians(:lat)) * sin(radians(e.lat))
      )
    `;

    let favoriteIds: number[] = [];

    if (userId) {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        select: ['favorites'],
      });
      favoriteIds = user?.favorites ?? [];
    }

    const queryBuilder = this.establishmentRepository
      .createQueryBuilder('e')
      .where(`${distance} < :radius`, { lat, lng, radius: radiusKm })
      .andWhere('e.lat IS NOT NULL AND e.lng IS NOT NULL');

    if (pageOptionsDto.search) {
      queryBuilder.andWhere(
        '(LOWER(e.name) LIKE LOWER(:search) OR LOWER(e.address) LIKE LOWER(:search) OR CAST(e.id AS TEXT) LIKE :search)',
        { search: `%${pageOptionsDto.search}%` }
      );
    }

    queryBuilder.orderBy(distance, pageOptionsDto.order);

    const establishments = await queryBuilder.getMany();

    return establishments;
  }

  // Query builder to get establishments with their metrics
  private getEstablishmentMetrics(): SelectQueryBuilder<Establishment> {
    return this.establishmentRepository
      .createQueryBuilder('establishment')
      .addSelect('COUNT(comments.id)', 'commentsCount')
      .addSelect('COALESCE(AVG(comments.rating), 0)', 'avgRating')
      .addSelect(
        // If the establishment has no comments, then weightedRating = 0
        // The fewer comments, the stronger the influence of the global rating
        `
        CASE 
          WHEN COUNT(comments.id) = 0 THEN 0
          ELSE (
            (COUNT(comments.id)::float / (COUNT(comments.id) + :m)) * AVG(comments.rating)
            +
            (:m::float / (COUNT(comments.id) + :m)) * :C
          )
        END
      `,
        'weightedRating'
      )
      .leftJoin('establishment.comments', 'comments')
      .setParameter('m', this.MINIMUM_COMMENTS)
      .setParameter('C', this.GLOBAL_AVERAGE_RATING)
      .leftJoinAndSelect('establishment.type', 'type')
      .leftJoinAndSelect('establishment.features', 'features')
      .groupBy('establishment.id')
      .addGroupBy('type.id')
      .addGroupBy('features.id');
  }

  private applySorting(
    queryBuilder: SelectQueryBuilder<Establishment>,
    pageOptionsDto: PageOptionsDto
  ): void {
    const sortColumn = {
      [SortField.WEIGHTED_RATING]: '"weightedRating"',
      [SortField.COMMENTS_COUNT]: '"commentsCount"',
      [SortField.AVG_RATING]: '"avgRating"',
    };

    const column = sortColumn[pageOptionsDto.sortBy];
    queryBuilder.orderBy(column, pageOptionsDto.order);
    queryBuilder.addOrderBy('establishment.id', 'ASC');
  }

  async getAllEstablishments(
    pageOptionsDto: PageOptionsDto,
    userId?: number
  ): Promise<PageDto<EstablishmentWithMetrics>> {
    const queryBuilder = this.getEstablishmentMetrics();

    if (pageOptionsDto.search) {
      queryBuilder.andWhere(
        '(LOWER(establishment.name) LIKE LOWER(:search) OR LOWER(establishment.address) LIKE LOWER(:search) OR CAST(establishment.id AS TEXT) LIKE :search)',
        { search: `%${pageOptionsDto.search}%` }
      );
    }

    if (pageOptionsDto.minRating) {
      queryBuilder.andHaving('AVG(comments.rating) >= :minRating', {
        minRating: pageOptionsDto.minRating,
      });
    }

    if (pageOptionsDto.typeId) {
      queryBuilder.andWhere('type.id = :typeId', {
        typeId: pageOptionsDto.typeId,
      });
    }

    this.applySorting(queryBuilder, pageOptionsDto);
    queryBuilder.offset(pageOptionsDto.skip).limit(pageOptionsDto.take);

    const results = await queryBuilder.getRawAndEntities();

    if (results.entities.length === 0) {
      const pageMetaDto = new PageMetaDto({ pageOptionsDto, itemCount: 0 });
      return new PageDto([], pageMetaDto);
    }

    let favoriteIds: number[] = [];

    if (userId) {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        select: ['favorites'],
      });

      favoriteIds = user?.favorites ?? [];
    }

    const enhancedEstablishments: EstablishmentWithMetrics[] =
      results.entities.map((establishment, index) => {
        const raw = results.raw[index];
        return {
          ...establishment,
          commentsCount: parseInt(raw.commentsCount) || 0,
          avgRating: parseFloat(raw.avgRating) || 0,
          weightedRating: parseFloat(raw.weightedRating) || 0,
          isFavorite: favoriteIds.includes(establishment.id),
        };
      });

    // Use filtered count, not total count
    const itemCount = await queryBuilder
      .clone()
      .offset(undefined)
      .limit(undefined)
      .getCount();

    const pageMetaDto = new PageMetaDto({ pageOptionsDto, itemCount });
    return new PageDto(enhancedEstablishments, pageMetaDto);
  }

  async getEstablishmentById(
    id: number,
    userId?: number
  ): Promise<Establishment & { isFavorite: boolean }> {
    const establishment = await this.establishmentRepository.findOne({
      where: { id },
      relations: ['type', 'features', 'comments', 'comments.user'],
      loadRelationIds: {
        relations: ['moderators'],
      },
    });

    if (!establishment) {
      throw new NotFoundException(`Establishment ${id} not found`);
    }

    const isFavorite = userId ? await this.isFavorite(userId, id) : false;

    return { ...establishment, isFavorite };
  }

  async getEstablishmentByOwner(ownerId: number) {
    const establishment = await this.establishmentRepository.find({
      where: { ownerId },
      relations: ['type', 'features', 'comments', 'comments.user'],
    });

    if (!establishment.length) {
      throw new NotFoundException(
        `Establishment for owner ${ownerId} not found`
      );
    }

    return establishment;
  }

  async getAllComments(id: number) {
    const establishment = await this.establishmentRepository.findOne({
      where: { id },
      relations: ['comments', 'comments.user'],
    });

    if (!establishment) {
      throw new NotFoundException(`Establishment ${id} not found`);
    }

    return establishment.comments;
  }

  async edit(id: number, updateEstablishmentDto: UpdateEstablishmentDto) {
    const establishment = await this.establishmentRepository.findOne({
      where: { id },
      relations: ['features'],
    });

    if (!establishment) {
      throw new NotFoundException(`Establishment ${id} not found`);
    }

    if (updateEstablishmentDto.coverPhoto) {
      establishment.coverPhoto = this.fileUploadService.getFileUrl(
        updateEstablishmentDto.coverPhoto.filename
      );
    }

    if (updateEstablishmentDto.photos !== undefined) {
      establishment.photos = updateEstablishmentDto.photos.map(photo =>
        this.fileUploadService.getFileUrl(photo.filename)
      );
    }

    const locationChanged =
      updateEstablishmentDto.city !== undefined ||
      updateEstablishmentDto.street !== undefined ||
      updateEstablishmentDto.building !== undefined ||
      updateEstablishmentDto.zipCode !== undefined;

    if (locationChanged) {
      const city =
        updateEstablishmentDto.city ?? establishment.locationDetails?.city;
      const street =
        updateEstablishmentDto.street ?? establishment.locationDetails?.street;
      const building =
        updateEstablishmentDto.building ??
        establishment.locationDetails?.building;
      const zipCode =
        updateEstablishmentDto.zipCode ??
        establishment.locationDetails?.zipCode;

      if (!city || !street || !building) {
        throw new BadRequestException(
          'city, street, and building are required to update establishment location'
        );
      }

      const locationDetails: NonNullable<Establishment['locationDetails']> = {
        city,
        street,
        building,
        ...(zipCode ? { zipCode } : {}),
      };

      const address = `${locationDetails.city}, ${locationDetails.street} ${locationDetails.building}${
        locationDetails.zipCode ? `, ${locationDetails.zipCode}` : ''
      }`;

      const coords = await this.geocodingService.geocode(address);

      establishment.address = address;
      establishment.locationDetails = locationDetails;
      establishment.lat = coords?.lat ?? null;
      establishment.lng = coords?.lng ?? null;
    }

    if (updateEstablishmentDto.typeId) {
      const type = await this.typeRepository.findOne({
        where: { id: updateEstablishmentDto.typeId },
      });

      if (!type) {
        throw new NotFoundException(
          `EstablishmentType ${updateEstablishmentDto.typeId} not found`
        );
      }

      establishment.type = type;
    }

    const { coverPhoto, photos, typeId, ...rest } = updateEstablishmentDto;
    this.establishmentRepository.merge(establishment, rest);
    return this.establishmentRepository.save(establishment);
  }

  async findOneWithFeatures(id: number) {
    const establishment = await this.establishmentRepository.findOne({
      where: { id },
      relations: ['features', 'comments', 'comments.user'],
    });

    if (!establishment) {
      throw new NotFoundException(`Establishment ${id} not found`);
    }

    return establishment;
  }

  async remove(id: number) {
    const result = await this.establishmentRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`Establishment ${id} not found`);
    }
  }

  async addFeature(establishmentId: number, featureId: number) {
    const establishment = await this.establishmentRepository.findOne({
      where: { id: establishmentId },
      relations: ['features'],
    });

    if (!establishment) {
      throw new NotFoundException(`Establishment ${establishmentId} not found`);
    }

    const feature = await this.featureRepository.findOne({
      where: { id: featureId },
    });

    if (!feature) {
      throw new NotFoundException(`Feature ${featureId} not found`);
    }

    const featureExists = establishment.features.some(f => f.id === featureId);

    if (featureExists) {
      throw new BadRequestException(
        'Feature already added to this establishment'
      );
    }

    establishment.features.push(feature);
    return await this.establishmentRepository.save(establishment);
  }

  async removeFeature(establishmentId: number, featureId: number) {
    const establishment = await this.establishmentRepository.findOne({
      where: { id: establishmentId },
      relations: ['features'],
    });

    if (!establishment) {
      throw new NotFoundException(`Establishment ${establishmentId} not found`);
    }

    const initialLength = establishment.features.length;
    establishment.features = establishment.features.filter(
      f => f.id !== featureId
    );

    if (establishment.features.length === initialLength) {
      throw new NotFoundException(
        `Feature ${featureId} not found in this establishment`
      );
    }

    return await this.establishmentRepository.save(establishment);
  }

  async addFavorite(userId: number, establishmentId: number) {
    const establishment = await this.establishmentRepository.findOneBy({
      id: establishmentId,
    });

    if (!establishment) {
      throw new NotFoundException(`Establishment ${establishmentId} not found`);
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    if (!user.favorites) {
      user.favorites = [];
    }

    if (!user.favorites.includes(establishmentId)) {
      user.favorites.push(establishmentId);
      await this.userRepository.save(user);
    }

    return user.favorites;
  }

  async removeFavorite(userId: number, establishmentId: number) {
    const establishment = await this.establishmentRepository.findOneBy({
      id: establishmentId,
    });

    if (!establishment) {
      throw new NotFoundException(`Establishment ${establishmentId} not found`);
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    if (!user.favorites) {
      user.favorites = [];
    }

    if (!user.favorites.includes(establishmentId)) {
      throw new BadRequestException(
        `User ${userId} does not have this establishment as favorite`
      );
    }

    user.favorites = user.favorites.filter(id => id !== establishmentId);

    await this.userRepository.save(user);
  }

  async getAllFavorites(userId: number) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    if (!user.favorites || user.favorites.length === 0) {
      return [];
    }

    const establishments = await this.establishmentRepository.find({
      where: { id: In(user.favorites) },
      relations: ['type', 'features'],
    });

    return establishments.map(est => ({ ...est, isFavorite: true }));
  }

  async addModerator(
    establishmentId: number,
    userId: number,
    currentUserId: number
  ) {
    const establishment = await this.establishmentRepository.findOne({
      where: { id: establishmentId },
      relations: ['owner', 'moderators'],
    });

    if (!establishment) {
      throw new NotFoundException(`Establishment ${establishmentId} not found`);
    }

    const currentUser = await this.userRepository.findOne({
      where: { id: currentUserId },
    });

    if (!currentUser) {
      throw new NotFoundException(`Current user ${currentUserId} not found`);
    }

    if (
      currentUser.role !== UserRole.SUPER_ADMIN &&
      establishment.ownerId !== currentUserId
    ) {
      throw new BadRequestException(
        `User ${currentUserId} does not have permission to add moderators`
      );
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    if (user.role !== UserRole.MODERATOR) {
      throw new BadRequestException(`User ${userId} is not a moderator`);
    }

    if (!establishment.moderators) {
      establishment.moderators = [];
    }

    const alreadyModerator = establishment.moderators.some(
      mod => mod.id === userId
    );

    if (alreadyModerator) {
      throw new BadRequestException(
        `User ${userId} is already a moderator of this establishment`
      );
    }

    establishment.moderators.push(user);
    return await this.establishmentRepository.save(establishment);
  }

  async removeModerator(
    establishmentId: number,
    userId: number,
    currentUserId: number
  ) {
    const establishment = await this.establishmentRepository.findOne({
      where: { id: establishmentId },
      relations: ['owner', 'moderators'],
    });

    if (!establishment) {
      throw new NotFoundException(`Establishment ${establishmentId} not found`);
    }

    const currentUser = await this.userRepository.findOne({
      where: { id: currentUserId },
    });

    if (!currentUser) {
      throw new NotFoundException(`Current user ${currentUserId} not found`);
    }

    if (
      currentUser.role !== UserRole.SUPER_ADMIN &&
      establishment.ownerId !== currentUserId
    ) {
      throw new BadRequestException(
        `You don't have permission to remove moderators from this establishment`
      );
    }

    const moderator = establishment.moderators.find(mod => mod.id === userId);
    if (!moderator) {
      throw new BadRequestException(
        `User ${userId} is not a moderator of this establishment`
      );
    }

    establishment.moderators = establishment.moderators.filter(
      mod => mod.id !== userId
    );
    return await this.establishmentRepository.save(establishment);
  }

  async getModerators(establishmentId: number) {
    const establishment = await this.establishmentRepository.findOne({
      where: { id: establishmentId },
      relations: ['owner', 'moderators'],
    });

    if (!establishment) {
      throw new NotFoundException(`Establishment ${establishmentId} not found`);
    }

    return establishment.moderators.map(mod => ({
      id: mod.id,
      name: mod.name,
      email: mod.email,
      role: mod.role,
    }));
  }
}
