import { Readable } from 'stream';

import { FileUploadService } from '@common/services/file-upload.service';
import { Feature } from '@modules/features/entities/feature.entity';
import { FeaturesService } from '@modules/features/features.service';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateFeatureDto } from './dto/create-feature.dto';
import { UpdateFeatureDto } from './dto/update-feature.dto';

describe('FeatureService', () => {
  let service: FeaturesService;
  let fileUploadService: FileUploadService;
  let featureRepository: Repository<Feature>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeaturesService,
        {
          provide: FileUploadService,
          useValue: {
            uploadFile: jest.fn(),
            deleteFile: jest.fn(),
            getFileUrl: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Feature),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<FeaturesService>(FeaturesService);
    fileUploadService = module.get<FileUploadService>(FileUploadService);
    featureRepository = module.get<Repository<Feature>>(
      getRepositoryToken(Feature)
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateFeatureDto = {
      id: 1,
      name: 'test',
    };

    const file: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'test.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: 100,
      destination: 'test',
      filename: 'test.jpg',
      path: 'test/test.jpg',
      buffer: Buffer.from('test'),
      stream: new Readable(),
    };

    it('should create a feature', async () => {
      const feature = {
        id: 1,
        name: 'test',
        image: 'test',
      } as Feature;

      jest.spyOn(fileUploadService, 'getFileUrl').mockReturnValue('test');
      jest
        .spyOn(featureRepository, 'create')
        .mockReturnValue(feature as Feature);
      jest
        .spyOn(featureRepository, 'save')
        .mockResolvedValue(feature as Feature);

      const result = await service.create(createDto, file);

      expect(fileUploadService.getFileUrl).toHaveBeenCalledWith(file.filename);
      expect(result).toEqual(feature);
    });

    it('should create a feature without image', async () => {
      const feature = {
        id: 1,
        name: 'test',
      } as Feature;

      jest
        .spyOn(featureRepository, 'create')
        .mockReturnValue(feature as Feature);
      jest
        .spyOn(featureRepository, 'save')
        .mockResolvedValue(feature as Feature);

      const result = await service.create(createDto);

      expect(fileUploadService.getFileUrl).not.toHaveBeenCalled();
      expect(featureRepository.create).toHaveBeenCalledWith({
        name: createDto.name,
        image: null,
      });
      expect(result).toEqual(feature);
    });

    it('should throw an error when saving feature fails', async () => {
      const error = new Error('Database error');

      jest.spyOn(featureRepository, 'create').mockReturnValue({} as Feature);

      jest.spyOn(featureRepository, 'save').mockRejectedValue(error);

      await expect(service.create(createDto)).rejects.toThrow(error);
    });
  });

  describe('FindAll', () => {
    it('should find all features', async () => {
      const features = [
        {
          id: 1,
          name: 'test',
        } as Feature,
        {
          id: 2,
          name: 'test',
        } as Feature,
      ];

      jest.spyOn(featureRepository, 'find').mockResolvedValue(features);

      const result = await service.findAll();

      expect(result).toEqual(features);
      expect(featureRepository.find).toHaveBeenCalled();
    });

    it('should return empty array if no features are found', async () => {
      jest.spyOn(featureRepository, 'find').mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
      expect(featureRepository.find).toHaveBeenCalled();
    });

    it('should throw an error when finding features fails', async () => {
      const error = new Error('Database error');

      jest.spyOn(featureRepository, 'find').mockRejectedValue(error);

      await expect(service.findAll()).rejects.toThrow(error);
    });
  });

  describe('FindOne', () => {
    it('should find one feature by id', async () => {
      const feature = {
        id: 1,
        name: 'test',
      } as Feature;

      jest.spyOn(featureRepository, 'findOne').mockResolvedValue(feature);

      const result = await service.findOne(1);

      expect(result).toEqual(feature);
      expect(featureRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw an error when feature is not found', async () => {
      jest.spyOn(featureRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
      expect(featureRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw an error when finding feature fails', async () => {
      const error = new Error('Database error');

      jest.spyOn(featureRepository, 'findOne').mockRejectedValue(error);

      await expect(service.findOne(1)).rejects.toThrow(error);
    });
  });

  describe('Update', () => {
    const updateDto: UpdateFeatureDto = {
      name: 'test',
    };

    const file: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'test.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: 100,
      destination: 'test',
      filename: 'test.jpg',
      path: 'test/test.jpg',
      buffer: Buffer.from('test'),
      stream: new Readable(),
    };

    it('should update a feature', async () => {
      const feature = {
        id: 1,
        name: 'test',
      } as Feature;

      jest.spyOn(featureRepository, 'findOne').mockResolvedValue(feature);
      jest.spyOn(fileUploadService, 'getFileUrl').mockReturnValue('test');
      jest.spyOn(featureRepository, 'save').mockResolvedValue(feature);

      const result = await service.update(1, updateDto, file);

      expect(featureRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(fileUploadService.getFileUrl).toHaveBeenCalledWith(file.filename);
      expect(featureRepository.save).toHaveBeenCalledWith(feature);
      expect(result).toEqual(feature);
    });

    it('should update a feature without image', async () => {
      const feature = {
        id: 1,
        name: 'test',
      } as Feature;

      jest.spyOn(featureRepository, 'findOne').mockResolvedValue(feature);
      jest.spyOn(featureRepository, 'save').mockResolvedValue(feature);

      const result = await service.update(1, updateDto);

      expect(featureRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(featureRepository.save).toHaveBeenCalledWith(feature);
      expect(result).toEqual(feature);
    });

    it('should throw an error when feature is not found', async () => {
      jest.spyOn(featureRepository, 'findOne').mockResolvedValue(null);

      await expect(service.update(1, updateDto)).rejects.toThrow(
        NotFoundException
      );
      expect(featureRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw an error when updating feature fails', async () => {
      const error = new Error('Database error');

      jest.spyOn(featureRepository, 'findOne').mockResolvedValue({
        id: 1,
        name: 'test',
      } as Feature);

      jest.spyOn(featureRepository, 'save').mockRejectedValue(error);

      await expect(service.update(1, updateDto)).rejects.toThrow(error);
    });
  });

  describe('Remove', () => {
    it('should remove a feature', async () => {
      const feature = {
        id: 1,
        name: 'test',
        image: 'test',
      } as Feature;

      jest.spyOn(featureRepository, 'findOne').mockResolvedValue(feature);
      jest.spyOn(fileUploadService, 'deleteFile').mockImplementation(() => {});
      jest
        .spyOn(featureRepository, 'delete')
        .mockResolvedValue({ affected: 1, raw: [] });

      const result = await service.remove(1);

      expect(featureRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(fileUploadService.deleteFile).toHaveBeenCalledWith(feature.image);
      expect(featureRepository.delete).toHaveBeenCalledWith(1);
      expect(result).toEqual({ message: 'Feature removed successfully' });
    });

    it('should throw an error when feature is not found', async () => {
      jest.spyOn(featureRepository, 'findOne').mockResolvedValue(null);

      await expect(service.remove(1)).rejects.toThrow(NotFoundException);
      expect(featureRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw an error when removing feature fails', async () => {
      const error = new Error('Database error');

      jest.spyOn(featureRepository, 'findOne').mockResolvedValue({
        id: 1,
        name: 'test',
        image: 'test',
      } as Feature);

      jest.spyOn(featureRepository, 'delete').mockRejectedValue(error);

      await expect(service.remove(1)).rejects.toThrow(error);
    });
  });
});
