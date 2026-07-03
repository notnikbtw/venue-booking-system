import { BookingController } from '@modules/booking/booking.controller';
import { BookingService } from '@modules/booking/booking.service';
import { Booking } from '@modules/booking/entities/booking.entity';
import { Test, TestingModule } from '@nestjs/testing';

describe('BookingController', () => {
  let controller: BookingController;
  let service: BookingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookingController],
      providers: [
        {
          provide: BookingService,
          useValue: {
            create: jest.fn(),
            getUserBookings: jest.fn(),
            getEstablishmentBookings: jest.fn(),
            getAllBookings: jest.fn(),
            getBookingById: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<BookingController>(BookingController);
    service = module.get<BookingService>(BookingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('booking', () => {
    it('should create a new booking', async () => {
      const createBookingDto = {
        establishment: 1,
        bookingDate: '2025-12-25',
        bookingTime: '18:30',
        numberOfGuests: 2,
      };

      const mockBooking = {
        id: 1,
        ...createBookingDto,
        status: 'PENDING',
        createdAt: new Date(),
      };

      jest
        .spyOn(service, 'create')
        .mockResolvedValue(mockBooking as unknown as Booking);

      const result = await controller.create(createBookingDto, {
        user: { id: 1 },
      });

      expect(result).toEqual(mockBooking);
      expect(service.create).toHaveBeenCalledWith(createBookingDto, 1);
    });

    it('should return a list of bookings for the current user', async () => {
      const mockData = [
        {
          user: { id: 1, name: 'User 1' },
          establishment: { id: 1, name: 'Establishment 1' },
          bookingDate: '2025-12-25',
          bookingTime: '18:30',
          numberOfGuests: 2,
          status: 'PENDING',
          createdAt: new Date(),
        },
      ];

      jest
        .spyOn(service, 'getUserBookings')
        .mockResolvedValue(mockData as unknown as Booking[]);

      const result = await controller.getUserBookings({ user: { id: 1 } });

      expect(result).toEqual(mockData);
      expect(service.getUserBookings).toHaveBeenCalledWith(1);
    });

    it('should return a list of bookings for a specific establishment', async () => {
      const mockData = [
        {
          establishment: { id: 1, name: 'Establishment 1' },
          user: { id: 1, name: 'User 1' },
          bookingDate: '2025-12-25',
          bookingTime: '18:30',
          numberOfGuests: 2,
          status: 'PENDING',
          createdAt: new Date(),
        },
      ];

      jest
        .spyOn(service, 'getEstablishmentBookings')
        .mockResolvedValue(mockData as unknown as Booking[]);

      const result = await controller.getEstablishmentBookings('1');

      expect(result).toEqual(mockData);
      expect(service.getEstablishmentBookings).toHaveBeenCalledWith(1);
    });

    it('should return a list of all reservations from the service', async () => {
      const mockData = [
        {
          id: 1,
          user: { id: 1, name: 'User 1' },
          establishment: { id: 1, name: 'Establishment 1' },
          bookingDate: '2025-12-25',
          bookingTime: '18:30',
          numberOfGuests: 2,
          status: 'PENDING',
          createdAt: new Date(),
        },
      ];

      jest
        .spyOn(service, 'getAllBookings')
        .mockResolvedValue(mockData as unknown as Booking[]);

      const result = await controller.getAllBookings();

      expect(result).toEqual(mockData);
      expect(service.getAllBookings).toHaveBeenCalledTimes(1);
    });

    it('should return booking by ID', async () => {
      const mockBooking = { id: 1, name: 'Booking 1' };
      jest
        .spyOn(service, 'getBookingById')
        .mockResolvedValue(mockBooking as unknown as Booking);

      const result = await controller.getBookingById('1');

      expect(result).toEqual(mockBooking);
      expect(service.getBookingById).toHaveBeenCalledWith(1);
    });
  });
});
