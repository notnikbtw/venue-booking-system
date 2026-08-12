import { CommentService } from '@modules/comment/comment.service';
import { Comment } from '@modules/comment/entities/comment.entity';
import { Establishment } from '@modules/establishment/entities/establishment.entity';
import { User, UserRole } from '@modules/users/entities/user.entity';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';

import { CreateCommentDto } from './dto/create-comment.dto';

import { PageOptionsDto } from '@/common/pagination/dto/page-options.dto';

describe('CommentService', () => {
  let service: CommentService;
  let userRepository: Repository<User>;
  let establishmentRepository: Repository<Establishment>;
  let commentRepository: Repository<Comment>;

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getCount: jest.fn(),
    getRawAndEntities: jest.fn(),
  } as unknown as jest.Mocked<SelectQueryBuilder<Comment>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentService,
        {
          provide: getRepositoryToken(Establishment),
          useValue: {
            findOneBy: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOneBy: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Comment),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            merge: jest.fn(),
            delete: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CommentService>(CommentService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    establishmentRepository = module.get<Repository<Establishment>>(
      getRepositoryToken(Establishment)
    );
    commentRepository = module.get<Repository<Comment>>(
      getRepositoryToken(Comment)
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  const mockUser = {
    id: 1,
    name: 'User',
  } as User;

  const mockEstablishment = {
    id: 1,
    name: 'Establishment',
    ownerId: 1,
    moderators: [
      {
        id: 1,
        name: 'User',
      } as User,
    ],
    totalSeats: 10,
    comments: [
      {
        rating: 5,
      },
    ],
  } as Establishment;

  const mockComment = {
    id: 1,
    text: 'Some text',
    rating: 5,
    createdAt: new Date(),
    establishment: mockEstablishment,
    user: mockUser,
  } as Comment;

  describe('create', () => {
    const createCommentDto: CreateCommentDto = {
      text: 'Some text',
      rating: 5,
      establishmentId: 1,
    };

    it('should create a comment when user and establishment exist', async () => {
      jest.spyOn(userRepository, 'findOneBy').mockResolvedValue(mockUser);
      jest
        .spyOn(establishmentRepository, 'findOneBy')
        .mockResolvedValue(mockEstablishment);
      jest
        .spyOn(establishmentRepository, 'findOne')
        .mockResolvedValue(mockEstablishment);
      jest
        .spyOn(establishmentRepository, 'save')
        .mockResolvedValue(mockEstablishment);
      jest
        .spyOn(commentRepository, 'create')
        .mockReturnValue(mockComment as Comment);
      jest.spyOn(commentRepository, 'save').mockResolvedValue(mockComment);

      const result = await service.create(createCommentDto, mockUser.id);
      expect(result).toEqual(mockComment);
      expect(userRepository.findOneBy).toHaveBeenCalledWith({
        id: mockUser.id,
      });

      expect(establishmentRepository.findOneBy).toHaveBeenCalledWith({
        id: createCommentDto.establishmentId,
      });

      expect(commentRepository.create).toHaveBeenCalledWith({
        text: createCommentDto.text,
        rating: createCommentDto.rating,
        user: mockUser,
        establishment: mockEstablishment,
      });

      expect(commentRepository.save).toHaveBeenCalledWith(mockComment);
    });

    it('throws NotFoundException when establishment does not exist', async () => {
      jest
        .spyOn(userRepository, 'findOneBy')
        .mockResolvedValue({ id: 1 } as User);
      jest.spyOn(establishmentRepository, 'findOneBy').mockResolvedValue(null);

      await expect(service.create(createCommentDto, 1)).rejects.toThrow(
        NotFoundException
      );
    });

    it('throws NotFoundException when user does not exist', async () => {
      jest.spyOn(userRepository, 'findOneBy').mockResolvedValue(null);
      jest
        .spyOn(establishmentRepository, 'findOneBy')
        .mockResolvedValue({ id: 1 } as Establishment);
      await expect(service.create(createCommentDto, 1)).rejects.toThrow(
        NotFoundException
      );
    });

    it('throws exception when user already commented on establishment', async () => {
      jest.spyOn(commentRepository, 'findOne').mockResolvedValue(mockComment);
      await expect(service.create(createCommentDto, 1)).rejects.toThrow();
      expect(commentRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll comments', () => {
    it('should return all comments', async () => {
      const pageOptionsDto = {
        page: 1,
        take: 10,
        skip: 0,
        order: 'DESC',
      } as PageOptionsDto;

      const mockComments = [
        {
          id: 1,
          text: 'Some text',
          rating: 5,
          createdAt: new Date(),
          establishment: {
            id: 1,
            name: 'Establishment',
          } as Establishment,
          user: {
            id: 1,
            name: 'User',
          } as User,
        },
      ] as Comment[];

      mockQueryBuilder.getCount.mockResolvedValue(1);
      mockQueryBuilder.getRawAndEntities.mockResolvedValue({
        entities: mockComments,
        raw: [],
      });
      jest
        .spyOn(commentRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder);

      const result = await service.findAllComments(pageOptionsDto);

      expect(result.data).toEqual(mockComments);
      expect(result.meta.itemCount).toBe(1);
      expect(commentRepository.createQueryBuilder).toHaveBeenCalledWith(
        'comments'
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'comments.user',
        'users'
      );
    });

    it('should return empty array when no comments found', async () => {
      const pageOptionsDto = {
        page: 1,
        take: 10,
        skip: 0,
        order: 'DESC',
      } as PageOptionsDto;

      const mockComments = [] as Comment[];

      mockQueryBuilder.getCount.mockResolvedValue(0);
      mockQueryBuilder.getRawAndEntities.mockResolvedValue({
        entities: mockComments,
        raw: [],
      });
      jest
        .spyOn(commentRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder);

      const result = await service.findAllComments(pageOptionsDto);

      expect(result.data).toEqual(mockComments);
      expect(result.meta.itemCount).toBe(0);
      expect(commentRepository.createQueryBuilder).toHaveBeenCalledWith(
        'comments'
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'comments.user',
        'users'
      );
    });
  });

  describe('find by establishment', () => {
    it('should return comments for establishment when it exists', async () => {
      const pageOptionsDto = {
        page: 1,
        take: 10,
        skip: 0,
        order: 'DESC',
      } as PageOptionsDto;

      const mockComments = [
        {
          id: 1,
          text: 'Some text',
          rating: 5,
          createdAt: new Date(),
          establishment: mockEstablishment,
          user: mockUser,
        },
        {
          id: 2,
          text: 'Some text',
          rating: 5,
          createdAt: new Date(),
          establishment: mockEstablishment,
          user: mockUser,
        },
      ] as Comment[];

      jest
        .spyOn(commentRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder);

      mockQueryBuilder.getCount.mockResolvedValue(2);
      mockQueryBuilder.getRawAndEntities.mockResolvedValue({
        entities: mockComments,
        raw: [],
      });
      const result = await service.findByEstablishment(
        mockEstablishment.id,
        pageOptionsDto
      );

      expect(result.data).toEqual(mockComments);
      expect(result.meta.itemCount).toBe(2);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'comments.establishment = :establishmentId',
        { establishmentId: 1 }
      );
    });

    it('should return empty array when no comments found', async () => {
      const pageOptionsDto = {
        page: 1,
        take: 10,
        skip: 0,
        order: 'DESC',
      } as PageOptionsDto;

      const mockComments = [] as Comment[];

      jest
        .spyOn(commentRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder);

      mockQueryBuilder.getCount.mockResolvedValue(0);
      mockQueryBuilder.getRawAndEntities.mockResolvedValue({
        entities: mockComments,
        raw: [],
      });
      const result = await service.findByEstablishment(1, pageOptionsDto);

      expect(result.data).toEqual(mockComments);
      expect(result.meta.itemCount).toBe(0);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'comments.establishment = :establishmentId',
        { establishmentId: 1 }
      );
    });
  });

  describe('update comment', () => {
    it('should update comment', async () => {
      const updatedComment = {
        text: 'Updated comment',
        rating: 4,
      };

      const savedComment = {
        ...mockComment,
        ...updatedComment,
      } as Comment;

      jest.spyOn(commentRepository, 'findOne').mockResolvedValue(mockComment);
      jest
        .spyOn(establishmentRepository, 'findOne')
        .mockResolvedValue(mockEstablishment);
      jest
        .spyOn(establishmentRepository, 'save')
        .mockResolvedValue(mockEstablishment);
      jest.spyOn(commentRepository, 'merge').mockReturnValue(savedComment);
      jest.spyOn(commentRepository, 'save').mockResolvedValue(savedComment);

      const result = await service.update(1, updatedComment);

      expect(result).toEqual(savedComment);
      expect(commentRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['establishment'],
      });
      expect(commentRepository.merge).toHaveBeenCalledWith(
        mockComment,
        updatedComment
      );
      expect(commentRepository.save).toHaveBeenCalledWith(mockComment);
    });

    it("should throw NotFoundException if comment doesn't exist", async () => {
      jest.spyOn(commentRepository, 'findOne').mockResolvedValue(null);

      await expect(service.update(999, { text: 'Updated' })).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('Delete comment', () => {
    it('should delete comment', async () => {
      jest.spyOn(commentRepository, 'findOne').mockResolvedValue(mockComment);
      jest.spyOn(commentRepository, 'delete').mockResolvedValue({
        affected: 1,
        raw: [],
      });
      jest
        .spyOn(establishmentRepository, 'findOne')
        .mockResolvedValue(mockEstablishment);
      jest
        .spyOn(establishmentRepository, 'save')
        .mockResolvedValue(mockEstablishment);

      const result = await service.remove(1, 1, UserRole.MODERATOR);
      expect(result).toEqual({ deleted: true });
    });

    it("should throw NotFoundException if comment doesn't exist", async () => {
      jest.spyOn(commentRepository, 'findOne').mockResolvedValue(null);

      await expect(service.remove(999, 1, UserRole.MODERATOR)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ForbiddenException if user is not owner or moderator', async () => {
      jest.spyOn(commentRepository, 'findOne').mockResolvedValue(mockComment);
      jest.spyOn(commentRepository, 'delete').mockResolvedValue({
        affected: 1,
        raw: [],
      });
      jest
        .spyOn(establishmentRepository, 'findOne')
        .mockResolvedValue(mockEstablishment);
      jest
        .spyOn(establishmentRepository, 'save')
        .mockResolvedValue(mockEstablishment);

      await expect(service.remove(1, 2, UserRole.MODERATOR)).rejects.toThrow(
        ForbiddenException
      );
    });
  });
});
