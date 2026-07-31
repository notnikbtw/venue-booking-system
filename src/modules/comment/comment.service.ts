import { PageMetaDto } from '@common/pagination/dto/page-meta.dto';
import { PageOptionsDto } from '@common/pagination/dto/page-options.dto';
import { PageDto } from '@common/pagination/dto/page.dto';
import { CreateCommentDto } from '@modules/comment/dto/create-comment.dto';
import { UpdateCommentDto } from '@modules/comment/dto/update-comment.dto';
import { Comment } from '@modules/comment/entities/comment.entity';
import { Establishment } from '@modules/establishment/entities/establishment.entity';
import { User, UserRole } from '@modules/users/entities/user.entity';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class CommentService {
  constructor(
    @InjectRepository(Comment)
    private commentRepository: Repository<Comment>,
    @InjectRepository(Establishment)
    private establishmentRepository: Repository<Establishment>,
    @InjectRepository(User)
    private userRepository: Repository<User>
  ) {}

  private async updateEstablishmentRating(establishmentId: number) {
    const establishment = await this.establishmentRepository.findOne({
      where: { id: establishmentId },
      relations: ['comments'],
    });

    if (!establishment) {
      throw new NotFoundException(`Establishment ${establishmentId} not found`);
    }

    const comments = establishment.comments;

    if (comments.length == 0) {
      establishment.rating = 0;
    } else {
      const commentRatingSum = comments.reduce(
        (accumulator, comment) => accumulator + comment.rating,
        0
      );
      establishment.rating = parseFloat(
        (commentRatingSum / comments.length).toFixed(2)
      );
    }

    await this.establishmentRepository.save(establishment);
    return establishment.rating;
  }

  async create(createCommentDto: CreateCommentDto, userId: number) {
    const { establishmentId, ...data } = createCommentDto;

    const establishment = await this.establishmentRepository.findOneBy({
      id: establishmentId,
    });

    if (!establishment) {
      throw new NotFoundException(`Establishment ${establishmentId} not found`);
    }

    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const existingComment = await this.commentRepository.findOne({
      where: {
        establishment: { id: establishmentId },
        user: { id: userId },
      },
    });

    if (existingComment) {
      throw new NotFoundException(
        `User ${userId} has already commented on establishment`
      );
    }

    const comment = this.commentRepository.create({
      ...data,
      establishment,
      user,
    });

    const savedComment = await this.commentRepository.save(comment);
    await this.updateEstablishmentRating(establishmentId);
    return savedComment;
  }

  async findAllComments(
    pageOptionsDto: PageOptionsDto
  ): Promise<PageDto<Comment>> {
    const queryBuilder = this.commentRepository
      .createQueryBuilder('comments')
      .leftJoinAndSelect('comments.user', 'users')
      .orderBy('comments.createdAt', pageOptionsDto.order)
      .skip(pageOptionsDto.skip)
      .take(pageOptionsDto.take);

    const itemCount = await queryBuilder.getCount();

    const { entities } = await queryBuilder.getRawAndEntities();
    const pageMetaDto = new PageMetaDto({ pageOptionsDto, itemCount });
    return new PageDto(entities, pageMetaDto);
  }

  async findByEstablishment(
    establishmentId: number,
    pageOptionsDto: PageOptionsDto
  ): Promise<PageDto<Comment>> {
    const queryBuilder = this.commentRepository
      .createQueryBuilder('comments')
      .leftJoinAndSelect('comments.user', 'users')
      .where('comments.establishment = :establishmentId', { establishmentId })
      .orderBy('comments.createdAt', pageOptionsDto.order)
      .skip(pageOptionsDto.skip)
      .take(pageOptionsDto.take);

    const establishment = await this.establishmentRepository.findOneBy({
      id: establishmentId,
    });

    if (!establishment) {
      throw new NotFoundException(`Establishment ${establishmentId} not found`);
    }

    const itemCount = await queryBuilder.getCount();

    const { entities } = await queryBuilder.getRawAndEntities();

    const pageMetaDto = new PageMetaDto({
      pageOptionsDto,
      itemCount,
    });

    return new PageDto(entities, pageMetaDto);
  }

  async update(id: number, updateCreateCommentDto: UpdateCommentDto) {
    const comment = await this.commentRepository.findOne({
      where: { id },
      relations: ['establishment'],
    });

    if (!comment) throw new NotFoundException(`Comment ${id} invalid`);

    this.commentRepository.merge(comment, updateCreateCommentDto);
    const savedComment = await this.commentRepository.save(comment);

    await this.updateEstablishmentRating(comment.establishment.id);
    return savedComment;
  }

  async remove(id: number, userId: number, userRole: UserRole) {
    const comment = await this.commentRepository.findOne({
      where: { id },
      relations: ['establishment', 'establishment.moderators'],
    });

    if (!comment) throw new NotFoundException(`Comment ${id} not found`);

    if (userRole !== UserRole.SUPER_ADMIN) {
      const establishment = comment.establishment;
      const isOwner = establishment.ownerId === userId;
      const isModerator = establishment.moderators?.some(
        mod => mod.id === userId
      );

      if (!isOwner && !isModerator) {
        throw new ForbiddenException(
          `User ${userId} does not have permission to delete this comment`
        );
      }
    }

    const establishmentId = comment.establishment.id;
    await this.commentRepository.delete(id);
    await this.updateEstablishmentRating(establishmentId);

    return { deleted: true };
  }
}
