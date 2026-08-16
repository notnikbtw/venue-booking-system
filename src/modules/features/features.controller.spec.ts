import { Readable } from 'stream';

import { FileUploadService } from '@common/services/file-upload.service';
import { Test, TestingModule } from '@nestjs/testing';

import { CreateFeatureDto } from './dto/create-feature.dto';
import { Feature } from './entities/feature.entity';
import { FeaturesController } from './features.controller';
import { FeaturesService } from './features.service';

describe('FeaturesController', () => {
  let controller: FeaturesController;
  let service: FeaturesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FeaturesController],
      providers: [
        {
          provide: FeaturesService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: FileUploadService,
          useValue: {
            uploadFile: jest.fn(),
            deleteFile: jest.fn(),
            getFileUrl: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<FeaturesController>(FeaturesController);
    service = module.get<FeaturesService>(FeaturesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
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
      const feature = { ...createDto, image: 'test.jpg' } as Feature;
      jest.spyOn(service, 'create').mockResolvedValue(feature);

      const result = await controller.create(createDto, file);

      expect(service.create).toHaveBeenCalledWith(createDto, file);
      expect(result).toEqual(feature);
    });

    it('should create a feature without file', async () => {
      const feature = { ...createDto } as Feature;
      jest.spyOn(service, 'create').mockResolvedValue(feature);

      const result = await controller.create(createDto);

      expect(service.create).toHaveBeenCalledWith(createDto, undefined);
      expect(result).toEqual(feature);
    });

    it('should throw error when service throws error', async () => {
      jest
        .spyOn(service, 'create')
        .mockRejectedValue(new Error('Service error'));

      await expect(controller.create(createDto, file)).rejects.toThrow(
        'Service error'
      );
    });
  });

  describe('findAll', () => {
    it('should return all features', async () => {
      const features = [{ id: 1, name: 'test' }] as Feature[];
      jest.spyOn(service, 'findAll').mockResolvedValue(features);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual(features);
    });

    it('should return empty array when no features are found', async () => {
      jest.spyOn(service, 'findAll').mockResolvedValue([]);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should throw error when service throws error', async () => {
      jest
        .spyOn(service, 'findAll')
        .mockRejectedValue(new Error('Service error'));

      await expect(controller.findAll()).rejects.toThrow('Service error');
    });
  });

  describe('findOne', () => {
    it('should return a feature by id', async () => {
      const feature = { id: 1, name: 'test' } as Feature;
      jest.spyOn(service, 'findOne').mockResolvedValue(feature);

      const result = await controller.findOne('1');

      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(feature);
    });

    it('should throw error when service throws error', async () => {
      jest
        .spyOn(service, 'findOne')
        .mockRejectedValue(new Error('Service error'));

      await expect(controller.findOne('1')).rejects.toThrow('Service error');
    });
  });

  describe('update', () => {
    const updateDto = { name: 'test' };

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
      const feature = { id: 1, name: 'test' } as Feature;
      jest.spyOn(service, 'update').mockResolvedValue(feature);

      const result = await controller.update('1', updateDto);

      expect(service.update).toHaveBeenCalledWith(1, updateDto, undefined);
      expect(result).toEqual(feature);
    });

    it('should return an error if the feature is not found', async () => {
      jest
        .spyOn(service, 'update')
        .mockRejectedValue(new Error('Feature not found'));

      await expect(controller.update('1', updateDto)).rejects.toThrow(
        'Feature not found'
      );
    });

    it('should update a feature with file', async () => {
      const feature = { id: 1, name: 'test' } as Feature;
      jest.spyOn(service, 'update').mockResolvedValue(feature);

      const result = await controller.update('1', updateDto, file);

      expect(service.update).toHaveBeenCalledWith(1, updateDto, file);
      expect(result).toEqual(feature);
    });

    it('should throw error when service throws error', async () => {
      jest
        .spyOn(service, 'update')
        .mockRejectedValue(new Error('Service error'));

      await expect(controller.update('1', updateDto)).rejects.toThrow(
        'Service error'
      );
    });
  });

  describe('remove', () => {
    it('should remove a feature', async () => {
      const expectedResponse = { message: 'Feature removed successfully' };
      jest.spyOn(service, 'remove').mockResolvedValue(expectedResponse);

      const result = await controller.remove('1');

      expect(service.remove).toHaveBeenCalledWith(1);
      expect(result).toEqual(expectedResponse);
    });

    it('should return an error if the feature is not found', async () => {
      jest
        .spyOn(service, 'remove')
        .mockRejectedValue(new Error('Feature not found'));

      await expect(controller.remove('1')).rejects.toThrow('Feature not found');
    });
  });
});
