import { EstablishmentOwnerGuard } from '@common/guard/establishment-owner.guard';
import { ScheduleController } from '@modules/schedule/schedule.controller';
import { ScheduleService } from '@modules/schedule/schedule.service';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { Schedule, ScheduleDays } from './entities/schedule.entity';

import { JwtAuthGuard } from '@/common/guard/jwt-auth.guard';

describe('ScheduleController', () => {
  let controller: ScheduleController;
  let service: ScheduleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScheduleController],
      providers: [
        {
          provide: ScheduleService,
          useValue: {
            create: jest.fn(),
            findByEstablishment: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(EstablishmentOwnerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ScheduleController>(ScheduleController);
    service = module.get<ScheduleService>(ScheduleService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create schedule', () => {
    const createScheduleDto = {
      establishmentId: 1,
      scheduleItems: [
        {
          day: [ScheduleDays.MONDAY],
          openTime: '09:00',
          closeTime: '20:00',
        },
        {
          day: [ScheduleDays.TUESDAY, ScheduleDays.WEDNESDAY],
          openTime: '10:00',
          closeTime: '18:00',
        },
      ],
    };

    it('should create schedule', async () => {
      const mockResponse = [
        {
          id: 1,
          day: ScheduleDays.MONDAY,
          openTime: '09:00',
          closeTime: '20:00',
        },
      ] as Schedule[];

      jest.spyOn(service, 'create').mockResolvedValue(mockResponse);

      const result = await controller.create(createScheduleDto);
      expect(service.create).toHaveBeenCalledWith(createScheduleDto);
      expect(result).toEqual(mockResponse);
    });

    it('should throw error if establishment not found', async () => {
      jest.spyOn(service, 'create').mockRejectedValue(new NotFoundException());

      await expect(controller.create(createScheduleDto)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('findByEstablishment', () => {
    it('should find schedules by establishment id', async () => {
      const mockSchedules = [
        {
          id: 1,
          day: ScheduleDays.MONDAY,
          openTime: '09:00',
          closeTime: '20:00',
        },
      ] as Schedule[];

      jest
        .spyOn(service, 'findByEstablishment')
        .mockResolvedValue(mockSchedules);

      const result = await controller.findByEstablishment('1');
      expect(service.findByEstablishment).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockSchedules);
    });

    it('should return empty array if no schedules found', async () => {
      jest.spyOn(service, 'findByEstablishment').mockResolvedValue([]);

      const result = await controller.findByEstablishment('1');
      expect(service.findByEstablishment).toHaveBeenCalledWith(1);
      expect(result).toEqual([]);
    });

    it('should throw error if service fails', async () => {
      jest
        .spyOn(service, 'findByEstablishment')
        .mockRejectedValue(new NotFoundException());

      await expect(controller.findByEstablishment('1')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('update', () => {
    it('should update schedule by id', async () => {
      const updateDto = { openTime: '08:00', closeTime: '21:00' };
      const mockUpdated = {
        id: 1,
        day: ScheduleDays.MONDAY,
        openTime: '08:00',
        closeTime: '21:00',
      } as Schedule;

      jest.spyOn(service, 'update').mockResolvedValue(mockUpdated);

      const result = await controller.update('1', updateDto);
      expect(service.update).toHaveBeenCalledWith(1, updateDto);
      expect(result).toEqual(mockUpdated);
    });

    it('should throw error when schedule is not found', async () => {
      jest.spyOn(service, 'update').mockRejectedValue(new NotFoundException());

      await expect(controller.update('1', {})).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('remove', () => {
    it('should delete schedule by id', async () => {
      jest.spyOn(service, 'remove').mockResolvedValue(undefined);

      const result = await controller.remove('1');
      expect(service.remove).toHaveBeenCalledWith(1);
      expect(result).toBeUndefined();
    });

    it('should throw error when schedule is not found', async () => {
      jest.spyOn(service, 'remove').mockRejectedValue(new NotFoundException());

      await expect(controller.remove('1')).rejects.toThrow(NotFoundException);
    });
  });
});
