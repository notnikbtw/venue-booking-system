import { Status } from '@googlemaps/google-maps-services-js';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { GeocodingService } from './geocoding.service';

describe('GeocodingService', () => {
  let service: GeocodingService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeocodingService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue('mock-api-key'),
          },
        },
      ],
    }).compile();

    service = module.get<GeocodingService>(GeocodingService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(configService.getOrThrow).toHaveBeenCalledWith(
      'GOOGLE_MAPS_API_KEY'
    );
  });

  describe('geocode', () => {
    it('should return coordinates when Google Maps returns Status.OK with results', async () => {
      const mockResponse = {
        data: {
          status: Status.OK,
          results: [
            {
              geometry: {
                location: {
                  lat: 52.2297,
                  lng: 21.0122,
                },
              },
            },
          ],
        },
      };

      jest
        .spyOn((service as any).client, 'geocode')
        .mockResolvedValue(mockResponse as any);

      const result = await service.geocode('Warsaw, Poland');

      expect(result).toEqual({ lat: 52.2297, lng: 21.0122 });
      expect((service as any).client.geocode).toHaveBeenCalledWith({
        params: {
          address: 'Warsaw, Poland',
          key: 'mock-api-key',
        },
      });
    });

    it('should return null if GOOGLE_MAPS_API_KEY is empty or missing', async () => {
      (service as any).GOOGLE_MAPS_API_KEY = '';

      const result = await service.geocode('Warsaw, Poland');

      expect(result).toBeNull();
    });

    it('should return null and warn when status is not OK', async () => {
      const mockResponse = {
        data: {
          status: Status.ZERO_RESULTS,
          results: [],
        },
      };

      jest
        .spyOn((service as any).client, 'geocode')
        .mockResolvedValue(mockResponse as any);

      const result = await service.geocode('Unknown Address 12345');

      expect(result).toBeNull();
    });

    it('should return null when status is OK but results array is empty', async () => {
      const mockResponse = {
        data: {
          status: Status.OK,
          results: [],
        },
      };

      jest
        .spyOn((service as any).client, 'geocode')
        .mockResolvedValue(mockResponse as any);

      const result = await service.geocode('Address with empty results');

      expect(result).toBeNull();
    });

    it('should handle client error and return null', async () => {
      jest
        .spyOn((service as any).client, 'geocode')
        .mockRejectedValue(new Error('Network error'));

      const result = await service.geocode('Warsaw, Poland');

      expect(result).toBeNull();
    });

    it('should handle non-Error throwables and return null', async () => {
      jest
        .spyOn((service as any).client, 'geocode')
        .mockRejectedValue('String error');

      const result = await service.geocode('Warsaw, Poland');

      expect(result).toBeNull();
    });
  });
});
