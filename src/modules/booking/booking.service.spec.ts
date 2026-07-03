import { BookingService } from '@modules/booking/booking.service';
import { Booking } from '@modules/booking/entities/booking.entity';
import { Establishment } from '@modules/establishment/entities/establishment.entity';
import { User } from '@modules/users/entities/user.entity';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

describe('BookingService', () => {
  let service: BookingService;
  let userRepository: Repository<User>;
  let establishmentRepository: Repository<Establishment>;
  let bookingRepository: Repository<Booking>;

  const mockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getRawOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Establishment),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Booking),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
      ],
    }).compile();

    service = module.get<BookingService>(BookingService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    establishmentRepository = module.get<Repository<Establishment>>(
      getRepositoryToken(Establishment)
    );
    bookingRepository = module.get<Repository<Booking>>(
      getRepositoryToken(Booking)
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createBookingDto = {
      establishment: 1,
      bookingDate: '2025-12-25',
      bookingTime: '18:30',
      numberOfGuests: 2,
    };

    it('should create a new booking', async () => {
      const mockUser = { id: 1, name: 'User' } as User;
      const mockEstablishment = {
        id: 1,
        name: 'Establishment',
      } as Establishment;
      const mockCreatedBooking = {
        id: 1,
        ...createBookingDto,
        user: mockUser,
        establishment: mockEstablishment,
        status: 'confirmed',
        createdAt: new Date(),
      } as unknown as Booking;

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest
        .spyOn(establishmentRepository, 'findOne')
        .mockResolvedValue(mockEstablishment);
      jest.spyOn(mockQueryBuilder, 'getRawOne').mockResolvedValue({ sum: 0 });
      jest
        .spyOn(bookingRepository, 'create')
        .mockReturnValue(mockCreatedBooking as Booking);
      jest
        .spyOn(bookingRepository, 'save')
        .mockResolvedValue(mockCreatedBooking as Booking);

      const result = await service.create(createBookingDto, mockUser.id);

      expect(result).toEqual(mockCreatedBooking);
      expect(bookingRepository.create).toHaveBeenCalled();
      expect(bookingRepository.save).toHaveBeenCalledWith(mockCreatedBooking);
    });

    it('should throw NotFoundException if user does not exist', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(service.create(createBookingDto, 1)).rejects.toThrow(
        new NotFoundException('User 1 not found')
      );

      expect(establishmentRepository.findOne).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if establishment does not exist', async () => {
      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue({ id: 1, name: 'User' } as User);

      jest.spyOn(establishmentRepository, 'findOne').mockResolvedValue(null);

      await expect(service.create(createBookingDto, 1)).rejects.toThrow(
        new NotFoundException('Establishment not found')
      );

      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });
  });

  describe('getBookingById', () => {
    it('should return a booking if it exists', async () => {
      const mockBooking = { id: 5, bookingTime: '20:00' } as Booking;

      jest.spyOn(bookingRepository, 'findOne').mockResolvedValue(mockBooking);

      const result = await service.getBookingById(5);

      expect(result).toEqual(mockBooking);
      expect(bookingRepository.findOne).toHaveBeenCalledWith({
        where: { id: 5 },
        relations: ['user', 'establishment'],
      });
    });

    it('should throw NotFoundException if booking does not exist', async () => {
      jest.spyOn(bookingRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getBookingById(5)).rejects.toThrow(
        new NotFoundException('Booking 5 not found')
      );

      expect(bookingRepository.findOne).toHaveBeenCalledWith({
        where: { id: 5 },
        relations: ['user', 'establishment'],
      });
    });
  });
});
