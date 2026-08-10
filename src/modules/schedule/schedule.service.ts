import { Establishment } from '@modules/establishment/entities/establishment.entity';
import { CreateSchedulesDto } from '@modules/schedule/dto/create-schedule.dto';
import { Schedule } from '@modules/schedule/entities/schedule.entity';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class ScheduleService {
  constructor(
    @InjectRepository(Schedule)
    private readonly scheduleRepository: Repository<Schedule>,

    @InjectRepository(Establishment)
    private readonly establishmentRepository: Repository<Establishment>
  ) {}

  async create(createSchedulesDto: CreateSchedulesDto) {
    const establishment = await this.establishmentRepository.findOne({
      where: { id: createSchedulesDto.establishmentId },
    });

    if (!establishment) {
      throw new NotFoundException(
        `Establishment ${createSchedulesDto.establishmentId} not found`
      );
    }

    const schedules = createSchedulesDto.scheduleItems.flatMap(item =>
      item.day.map(day =>
        this.scheduleRepository.create({
          establishment,
          day,
          openTime: item.openTime,
          closeTime: item.closeTime,
        })
      )
    );

    return await this.scheduleRepository.save(schedules);
  }

  async findByEstablishment(establishmentId: number) {
    const establishment = await this.establishmentRepository.findOneBy({
      id: establishmentId,
    });

    if (!establishment) {
      throw new NotFoundException(`Establishment ${establishmentId} not found`);
    }

    return this.scheduleRepository.find({
      where: {
        establishment: { id: establishmentId },
      },
      order: {
        day: 'ASC',
      },
    });
  }

  async update(
    id: number,
    userData: { openTime?: string; closeTime?: string }
  ) {
    const schedule = await this.scheduleRepository.findOne({
      where: { id },
    });

    if (!schedule) {
      throw new NotFoundException(`Schedule ${id} not found`);
    }

    if (userData.openTime) {
      schedule.openTime = userData.openTime;
    }

    if (userData.closeTime) {
      schedule.closeTime = userData.closeTime;
    }

    return this.scheduleRepository.save(schedule);
  }

  async remove(id: number) {
    const result = await this.scheduleRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Schedule ${id} not found`);
    }
  }
}
