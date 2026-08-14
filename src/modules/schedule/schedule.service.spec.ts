import { Establishment } from '@modules/establishment/entities/establishment.entity';
import {
  CreateScheduleItemDto,
  CreateSchedulesDto,
} from '@modules/schedule/dto/create-schedule.dto';
import {
  Schedule,
  ScheduleDays,
} from '@modules/schedule/entities/schedule.entity';
import { ScheduleService } from '@modules/schedule/schedule.service';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UpdateSingleScheduleDto } from './dto/update-schedule.dto';

describe('ScheduleService', () => {
  let service: ScheduleService;
  let scheduleRepository: Repository<Schedule>;
  let establishmentRepository: Repository<Establishment>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduleService,
        {
          provide: getRepositoryToken(Schedule),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Establishment),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ScheduleService>(ScheduleService);
    scheduleRepository = module.get<Repository<Schedule>>(
      getRepositoryToken(Schedule)
    );
    establishmentRepository = module.get<Repository<Establishment>>(
      getRepositoryToken(Establishment)
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Create schedule', () => {
    const createScheduleItemDto: CreateScheduleItemDto[] = [
      {
        day: [ScheduleDays.MONDAY],
        openTime: '09:00',
        closeTime: '20:00',
      },
      {
        day: [ScheduleDays.FRIDAY],
        openTime: '10:00',
        closeTime: '19:00',
      },
    ];

    const createSchedulesDto: CreateSchedulesDto = {
      establishmentId: 1,
      scheduleItems: createScheduleItemDto,
    };

    it('should create schedule when establishment exist', async () => {
      const mockEstablishment = { id: 1 } as Establishment;
      const mockCreatedSchedules = [
        {
          id: 1,
          establishment: mockEstablishment,
          day: ScheduleDays.MONDAY,
          openTime: '09:00',
          closeTime: '20:00',
        },
        {
          id: 2,
          establishment: mockEstablishment,
          day: ScheduleDays.FRIDAY,
          openTime: '10:00',
          closeTime: '19:00',
        },
      ] as Schedule[];

      jest
        .spyOn(establishmentRepository, 'findOne')
        .mockResolvedValue(mockEstablishment);
      jest
        .spyOn(scheduleRepository, 'create')
        .mockImplementation(dto => dto as Schedule);
      jest
        .spyOn(scheduleRepository, 'save')
        .mockResolvedValue(mockCreatedSchedules as any);

      const result = await service.create(createSchedulesDto);

      expect(establishmentRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual(mockCreatedSchedules);
    });

    it('should throw exception when establishment does not exist', async () => {
      jest.spyOn(establishmentRepository, 'findOne').mockResolvedValue(null);

      await expect(service.create(createSchedulesDto)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should return empty array when schedule items are empty', async () => {
      const mockEstablishment = { id: 1 } as Establishment;
      const emptyScheduleDto: CreateSchedulesDto = {
        establishmentId: 1,
        scheduleItems: [],
      };
      jest
        .spyOn(establishmentRepository, 'findOne')
        .mockResolvedValue(mockEstablishment);
      jest.spyOn(scheduleRepository, 'save').mockResolvedValue([] as any);

      const result = await service.create(emptyScheduleDto);
      expect(result).toEqual([]);
    });
  });

  describe('find by establishment', () => {
    const mockEstablishment = { id: 1 } as Establishment;

    it('should find by establishment id', async () => {
      const mockSchedule = [
        {
          id: 1,
          day: ScheduleDays.MONDAY,
          openTime: '09:00',
          closeTime: '20:00',
        },
        {
          id: 2,
          day: ScheduleDays.FRIDAY,
          openTime: '10:00',
          closeTime: '19:00',
        },
      ] as Schedule[];
      jest.spyOn(scheduleRepository, 'find').mockResolvedValue(mockSchedule);

      const result = await service.findByEstablishment(mockEstablishment.id);
      expect(result).toEqual(mockSchedule);
    });

    it('should return empty values when no schedule found', async () => {
      jest.spyOn(scheduleRepository, 'find').mockResolvedValue([]);
      const result = await service.findByEstablishment(mockEstablishment.id);
      expect(result).toEqual([]);
    });
  });

  describe('update', () => {
    const updateScheduleDto: UpdateSingleScheduleDto = {
      openTime: '09:00',
      closeTime: '20:00',
    };

    const mockEstablishment = { id: 1 } as Establishment;

    it('should update schedule', async () => {
      const mockSchedule = {
        id: 1,
        day: ScheduleDays.MONDAY,
        openTime: '09:00',
        closeTime: '20:00',
      } as Schedule;

      jest.spyOn(scheduleRepository, 'findOne').mockResolvedValue(mockSchedule);
      jest.spyOn(scheduleRepository, 'save').mockResolvedValue(mockSchedule);

      const result = await service.update(
        mockEstablishment.id,
        updateScheduleDto
      );
      expect(result).toEqual(mockSchedule);
    });

    it('should throw exception when schedule not found', async () => {
      jest.spyOn(scheduleRepository, 'findOne').mockResolvedValue(null);
      await expect(
        service.update(mockEstablishment.id, updateScheduleDto)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete schedule when found', async () => {
      jest
        .spyOn(scheduleRepository, 'delete')
        .mockResolvedValue({ affected: 1, raw: [] });
      await service.remove(1);
      expect(scheduleRepository.delete).toHaveBeenCalledWith(1);
    });

    it('should throw exception when schedule not found', async () => {
      jest
        .spyOn(scheduleRepository, 'delete')
        .mockResolvedValue({ affected: 0, raw: [] });
      await expect(service.remove(1)).rejects.toThrow(NotFoundException);
    });
  });
});
