import { PageOptionsDto } from '@common/pagination/dto/page-options.dto';
import { PageDto } from '@common/pagination/dto/page.dto';
import { CommentController } from '@modules/comment/comment.controller';
import { CommentService } from '@modules/comment/comment.service';
import { Comment } from '@modules/comment/entities/comment.entity';
import { Establishment } from '@modules/establishment/entities/establishment.entity';
import { User, UserRole } from '@modules/users/entities/user.entity';
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

describe('CommentController', () => {
  let controller: CommentController;
  let service: CommentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommentController],
      providers: [
        {
          provide: CommentService,
          useValue: {
            create: jest.fn(),
            findAllComments: jest.fn(),
            findByEstablishment: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<CommentController>(CommentController);
    service = module.get<CommentService>(CommentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  const createMockComment = (): Comment =>
    ({
      id: 1,
      text: 'Comment',
      rating: 5,
      createdAt: new Date(),
      user: { id: 1 } as User,
      establishment: { id: 1 } as Establishment,
    }) as Comment;

  describe('Create comment', () => {
    const createCommentDto = {
      establishmentId: 1,
      text: 'Great food and service!',
      rating: 5,
    };

    it('should create a new comment for a user', async () => {
      const mockUser = {
        id: 1,
        role: UserRole.USER,
      } as User;

      const mockComment = createMockComment();

      jest.spyOn(service, 'create').mockResolvedValue(mockComment);

      const result = await controller.create(createCommentDto, mockUser);

      expect(result).toEqual(mockComment);
      expect(service.create).toHaveBeenCalledWith(
        createCommentDto,
        mockUser.id
      );
    });

    it('should throw an error when service.create fails', async () => {
      const mockUser = { id: 1 } as User;

      jest
        .spyOn(service, 'create')
        .mockRejectedValue(new BadRequestException());

      await expect(
        controller.create(createCommentDto, mockUser)
      ).rejects.toThrow(BadRequestException);

      expect(service.create).toHaveBeenCalledWith(
        createCommentDto,
        mockUser.id
      );
    });
  });

  describe('Get all comments', () => {
    it('should return comments', async () => {
      const pageOptionsDto = new PageOptionsDto();

      const mockComments = [
        {
          id: 1,
          text: 'Comment 1',
          rating: 5,
          createdAt: new Date(),
          user: { id: 1 },
          establishment: { id: 1 },
        },
        {
          id: 2,
          text: 'Comment 2',
          rating: 4,
          createdAt: new Date(),
          user: { id: 2 },
          establishment: { id: 2 },
        },
      ] as Comment[];

      const mockPageDto = {
        data: mockComments,
        meta: {
          page: 1,
          take: 10,
          itemCount: 2,
          pageCount: 1,
          hasPreviousPage: false,
          hasNextPage: false,
        },
      } as PageDto<Comment>;

      jest.spyOn(service, 'findAllComments').mockResolvedValue(mockPageDto);

      const result = await controller.findAllComments(pageOptionsDto);

      expect(result).toEqual(mockPageDto);
      expect(service.findAllComments).toHaveBeenCalledWith(pageOptionsDto);
    });

    it('should throw an error when service.findAllComments fails', async () => {
      const pageOptionsDto = new PageOptionsDto();
      jest
        .spyOn(service, 'findAllComments')
        .mockRejectedValue(new BadRequestException());

      await expect(controller.findAllComments(pageOptionsDto)).rejects.toThrow(
        BadRequestException
      );

      expect(service.findAllComments).toHaveBeenCalledWith(pageOptionsDto);
    });
  });

  describe('Find comments by establishment', () => {
    const pageOptionsDto = new PageOptionsDto();

    it('should return comments for a given establishment id', async () => {
      const mockComments = [
        {
          id: 1,
          text: 'Comment 1',
          rating: 5,
          createdAt: new Date(),
          user: { id: 1 },
          establishment: { id: 1 },
        },
        {
          id: 2,
          text: 'Comment 2',
          rating: 4,
          createdAt: new Date(),
          user: { id: 2 },
          establishment: { id: 1 },
        },
      ] as Comment[];

      const mockPageDto = {
        data: mockComments,
        meta: {
          page: 1,
          take: 10,
          itemCount: 2,
          pageCount: 1,
          hasPreviousPage: false,
          hasNextPage: false,
        },
      } as PageDto<Comment>;

      jest.spyOn(service, 'findByEstablishment').mockResolvedValue(mockPageDto);

      const result = await controller.findByEstablishment(1, pageOptionsDto);

      expect(result).toEqual(mockPageDto);
      expect(service.findByEstablishment).toHaveBeenCalledWith(
        1,
        pageOptionsDto
      );
    });

    it('should throw an error when service.findByEstablishment fails', async () => {
      const pageOptionsDto = new PageOptionsDto();
      jest
        .spyOn(service, 'findByEstablishment')
        .mockRejectedValue(new BadRequestException());

      await expect(
        controller.findByEstablishment(1, pageOptionsDto)
      ).rejects.toThrow(BadRequestException);

      expect(service.findByEstablishment).toHaveBeenCalledWith(
        1,
        pageOptionsDto
      );
    });
  });

  describe('Update comment', () => {
    it('should update a comment', async () => {
      const updateCommentDto = {
        text: 'Updated comment',
        rating: 5,
      };

      const mockComment = createMockComment();

      jest.spyOn(service, 'update').mockResolvedValue(mockComment);

      const result = await controller.update('1', updateCommentDto);

      expect(result).toEqual(mockComment);
      expect(service.update).toHaveBeenCalledWith(1, updateCommentDto);
    });

    it('should throw an error when service.update fails', async () => {
      const updateCommentDto = {
        text: 'Updated comment',
        rating: 5,
      };

      jest
        .spyOn(service, 'update')
        .mockRejectedValue(new BadRequestException());

      await expect(controller.update('1', updateCommentDto)).rejects.toThrow(
        BadRequestException
      );

      expect(service.update).toHaveBeenCalledWith(1, updateCommentDto);
    });
  });

  describe('Remove comment', () => {
    it('should remove a comment', async () => {
      const mockUser = {
        id: 1,
        role: UserRole.OWNER,
      } as User;

      jest.spyOn(service, 'remove').mockResolvedValue({ deleted: true });

      const result = await controller.remove('1', mockUser);

      expect(result).toEqual({ deleted: true });
      expect(service.remove).toHaveBeenCalledWith(
        1,
        mockUser.id,
        mockUser.role
      );
    });

    it('should throw an error when service.remove fail', async () => {
      const mockUser = {
        id: 1,
        role: UserRole.OWNER,
      } as User;

      jest
        .spyOn(service, 'remove')
        .mockRejectedValue(new BadRequestException());

      await expect(controller.remove('1', mockUser)).rejects.toThrow(
        BadRequestException
      );

      expect(service.remove).toHaveBeenCalledWith(
        1,
        mockUser.id,
        mockUser.role
      );
    });
  });
});
