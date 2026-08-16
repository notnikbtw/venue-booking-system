import { EstablishmentTypeController } from '@modules/establishment-type/establishment-type.controller';
import { EstablishmentTypeService } from '@modules/establishment-type/establishment-type.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DeleteResult } from 'typeorm';

import { EstablishmentType } from './entities/establishment-type.entity';

describe('EstablishmentTypeController', () => {
  let controller: EstablishmentTypeController;
  let service: EstablishmentTypeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EstablishmentTypeController],
      providers: [
        {
          provide: EstablishmentTypeService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<EstablishmentTypeController>(
      EstablishmentTypeController
    );
    service = module.get<EstablishmentTypeService>(EstablishmentTypeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new establishment type', async () => {
      const createDto = { name: 'Restaurant' };
      const mockCreatedType = { id: 1, ...createDto } as EstablishmentType;

      jest.spyOn(service, 'create').mockResolvedValue(mockCreatedType);

      const result = await controller.create(createDto);

      expect(result).toEqual(mockCreatedType);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });

    it('should throw BadRequestException if the establishment type already exists', async () => {
      const createDto = { name: 'Restaurant' };
      jest
        .spyOn(service, 'create')
        .mockRejectedValue(
          new BadRequestException('EstablishmentType already exists')
        );

      await expect(controller.create(createDto)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('findAll', () => {
    it('should return all establishment types', async () => {
      const mockTypes = [
        { id: 1, name: 'Restaurant' },
        { id: 2, name: 'Hotel' },
      ] as EstablishmentType[];

      jest.spyOn(service, 'findAll').mockResolvedValue(mockTypes);

      const result = await controller.findAll();

      expect(result).toEqual(mockTypes);
      expect(service.findAll).toHaveBeenCalled();
    });

    it('should return emtpy array if there are no establishment types', async () => {
      const mockTypes: EstablishmentType[] = [];

      jest.spyOn(service, 'findAll').mockResolvedValue(mockTypes);

      const result = await controller.findAll();

      expect(result).toEqual(mockTypes);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return an establishment type by id', async () => {
      const mockType = { id: 1, name: 'Restaurant' } as EstablishmentType;

      jest.spyOn(service, 'findOne').mockResolvedValue(mockType);

      const result = await controller.findOne(1);

      expect(result).toEqual(mockType);
      expect(service.findOne).toHaveBeenCalledWith(1);
    });

    it('should throw not found when establishment type does not exist', async () => {
      jest
        .spyOn(service, 'findOne')
        .mockRejectedValue(
          new NotFoundException('EstablishmentType 1 not found')
        );

      await expect(controller.findOne(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update an establishment type', async () => {
      const updateDto = { name: 'Restaurant' };
      const mockUpdatedType = { id: 1, ...updateDto } as EstablishmentType;

      jest.spyOn(service, 'update').mockResolvedValue(mockUpdatedType);

      const result = await controller.update(1, updateDto);

      expect(result).toEqual(mockUpdatedType);
      expect(service.update).toHaveBeenCalledWith(1, updateDto);
    });

    it('should throw BadRequestException if the establishment type already exists', async () => {
      const updateDto = { name: 'Restaurant' };
      jest
        .spyOn(service, 'update')
        .mockRejectedValue(
          new BadRequestException('EstablishmentType already exists')
        );

      await expect(controller.update(1, updateDto)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw NotFoundException if the establishment type does not exist', async () => {
      const updateDto = { name: 'Restaurant' };
      jest
        .spyOn(service, 'update')
        .mockRejectedValue(
          new NotFoundException('EstablishmentType 1 not found')
        );

      await expect(controller.update(1, updateDto)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('remove', () => {
    it('should remove an establishment type', async () => {
      const mockResult = { affected: 1 } as DeleteResult;

      jest.spyOn(service, 'remove').mockResolvedValue(mockResult);

      const result = await controller.remove(1);

      expect(result).toEqual(mockResult);
      expect(service.remove).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException if the establishment type does not exist', async () => {
      jest
        .spyOn(service, 'remove')
        .mockRejectedValue(
          new NotFoundException('EstablishmentType 1 not found')
        );

      await expect(controller.remove(1)).rejects.toThrow(NotFoundException);
    });
  });
});
