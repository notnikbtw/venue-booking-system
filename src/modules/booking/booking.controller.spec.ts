import { BookingController } from '@modules/booking/booking.controller';
import { BookingService } from '@modules/booking/booking.service';
import { Booking } from '@modules/booking/entities/booking.entity';
import { Test, TestingModule } from '@nestjs/testing';

interface RequestWithUser {
  user: { id: number };
}

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

  describe('create', () => {
    const createBookingDto = {
      establishment: 1,
      bookingDate: '2025-12-25',
      bookingTime: '18:30',
      numberOfGuests: 2,
    };

    it('should create a new booking and pass the current user id to the service', async () => {
      const mockBooking = {
        id: 1,
        ...createBookingDto,
        status: 'PENDING',
        createdAt: new Date(),
      };

      jest
        .spyOn(service, 'create')
        .mockResolvedValue(mockBooking as unknown as Booking);

      const req: RequestWithUser = { user: { id: 1 } };
      const result = await controller.create(createBookingDto, req);

      expect(result).toEqual(mockBooking);
      expect(service.create).toHaveBeenCalledWith(createBookingDto, 1);
      expect(service.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('getUserBookings', () => {
    it("should return the current user's bookings", async () => {
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

      const req: RequestWithUser = { user: { id: 1 } };
      const result = await controller.getUserBookings(req);

      expect(result).toEqual(mockData);
      expect(service.getUserBookings).toHaveBeenCalledWith(1);
    });
  });

  describe('getEstablishmentBookings', () => {
    it('should return bookings for the given establishment id, converted to a number', async () => {
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
  });

  describe('getAllBookings', () => {
    it('should return all bookings from the service', async () => {
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
  });

  describe('getBookingById', () => {
    it('should return a booking by id, converted to a number', async () => {
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
