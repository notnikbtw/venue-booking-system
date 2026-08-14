import { EstablishmentType } from '@modules/establishment-type/entities/establishment-type.entity';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { EstablishmentTypeService } from './establishment-type.service';

describe('EstablishmentTypeService', () => {
  let service: EstablishmentTypeService;
  let repository: Repository<EstablishmentType>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EstablishmentTypeService,
        {
          provide: getRepositoryToken(EstablishmentType),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            merge: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EstablishmentTypeService>(EstablishmentTypeService);
    repository = module.get<Repository<EstablishmentType>>(
      getRepositoryToken(EstablishmentType)
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createTypeDto = {
      name: 'Restaurant',
    };

    it('should create a new establishment type', async () => {
      const mockCreatedType = {
        id: 1,
        ...createTypeDto,
      } as EstablishmentType;

      jest.spyOn(repository, 'create').mockReturnValue(mockCreatedType);
      jest.spyOn(repository, 'save').mockResolvedValue(mockCreatedType);

      const result = await service.create(createTypeDto);

      expect(result).toEqual(mockCreatedType);

      expect(repository.create).toHaveBeenCalledWith(createTypeDto);
      expect(repository.save).toHaveBeenCalledWith(mockCreatedType);
    });

    it('should throw error when saving fails', async () => {
      const error = new Error('Database error');
      jest.spyOn(repository, 'create').mockReturnValue({} as EstablishmentType);
      jest.spyOn(repository, 'save').mockRejectedValue(error);

      await expect(service.create(createTypeDto)).rejects.toThrow(error);
    });
  });

  describe('findAll', () => {
    it('should return an array of establishment types', async () => {
      const mockTypes = [
        {
          id: 1,
          name: 'Restaurant',
        },
        {
          id: 2,
          name: 'Hotel',
        },
      ] as EstablishmentType[];

      jest.spyOn(repository, 'find').mockResolvedValue(mockTypes);

      const result = await service.findAll();

      expect(result).toEqual(mockTypes);

      expect(repository.find).toHaveBeenCalled();
    });

    it('should return empty array when no establishment types are found', async () => {
      jest.spyOn(repository, 'find').mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);

      expect(repository.find).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return an establishment type by id', async () => {
      const mockType = {
        id: 1,
        name: 'Restaurant',
      } as EstablishmentType;

      jest.spyOn(repository, 'findOne').mockResolvedValue(mockType);

      const result = await service.findOne(1);

      expect(result).toEqual(mockType);

      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should throw not found when establishment type does not exist', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      await expect(service.findOne(1)).rejects.toThrow(
        'EstablishmentType 1 not found'
      );

      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });
  });

  describe('update', () => {
    const updateTypeDto = {
      name: 'Restaurant',
    };

    it('should update an establishment type', async () => {
      const mockExistingType = {
        id: 1,
        name: 'Restaurant',
      } as EstablishmentType;

      const mockUpdatedType = {
        id: 1,
        name: 'Restaurant',
      } as EstablishmentType;

      jest.spyOn(service, 'findOne').mockResolvedValue(mockExistingType);
      jest.spyOn(repository, 'merge').mockReturnValue(mockUpdatedType);
      jest.spyOn(repository, 'save').mockResolvedValue(mockUpdatedType);

      const result = await service.update(1, updateTypeDto);

      expect(result).toEqual(mockUpdatedType);

      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(repository.merge).toHaveBeenCalledWith(
        mockExistingType,
        updateTypeDto
      );
      expect(repository.save).toHaveBeenCalledWith(mockUpdatedType);
    });

    it('should throw error when update fails', async () => {
      const error = new Error('Database error');
      jest.spyOn(service, 'findOne').mockResolvedValue({
        id: 1,
        name: 'Restaurant',
      } as EstablishmentType);
      jest.spyOn(repository, 'merge').mockReturnValue({
        id: 1,
        name: 'Restaurant',
      } as EstablishmentType);
      jest.spyOn(repository, 'save').mockRejectedValue(error);

      await expect(service.update(1, updateTypeDto)).rejects.toThrow(error);
    });

    it('should throw not found when establishment type not exist', async () => {
      jest
        .spyOn(service, 'findOne')
        .mockRejectedValue(
          new NotFoundException('EstablishmentType 1 not found')
        );

      await expect(service.update(1, updateTypeDto)).rejects.toThrow(
        NotFoundException
      );

      expect(service.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('remove', () => {
    it('should remove an establishment type', async () => {
      const mockResult = {
        affected: 1,
      } as any;

      jest.spyOn(repository, 'delete').mockResolvedValue(mockResult);

      const result = await service.remove(1);

      expect(result).toEqual(mockResult);

      expect(repository.delete).toHaveBeenCalledWith(1);
    });

    it('should throw not found when establishment type does not exist', async () => {
      const mockResult = {
        affected: 0,
      } as any;

      jest.spyOn(repository, 'delete').mockResolvedValue(mockResult);

      await expect(service.remove(1)).rejects.toThrow(
        'EstablishmentType 1 not found'
      );

      expect(repository.delete).toHaveBeenCalledWith(1);
    });
  });
});
