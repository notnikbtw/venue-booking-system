import { validationSchema } from '@config/env.validation';
import { throttlerConfig } from '@config/throttler.config';
import { typeOrmConfig } from '@config/typeorm.config';
import { avatarUploadService } from '@config/uploads/avatar-upload.config';
import { establishmentUploadService } from '@config/uploads/establishment.config';
import { featureUploadService } from '@config/uploads/feature-upload.config';
import { AuthResponseDto } from '@modules/auth/dto/auth-response.dto';

describe('Configuration and Upload Services', () => {
  describe('TypeOrm Config', () => {
    it('should have typeorm config with autoLoadEntities true', () => {
      expect(typeOrmConfig).toBeDefined();
      expect(typeOrmConfig.autoLoadEntities).toBe(true);
    });
  });

  describe('Environment Validation Schema', () => {
    it('should validate valid environment variables', () => {
      const validEnv = {
        JWT_ACCESS_SECRET: 'access-secret',
        JWT_REFRESH_SECRET: 'refresh-secret',
        JWT_ACCESS_EXPIRES_IN: 900,
        JWT_REFRESH_EXPIRES_IN: 604800,
        GOOGLE_MAPS_API_KEY: 'gmaps-key',
        UPLOADS_ESTABLISHMENTS_PATH: 'uploads/establishments',
        MINIMUM_COMMENTS: 5,
        GLOBAL_AVERAGE_RATING: 3.5,
      };

      const { error, value } = validationSchema.validate(validEnv);
      expect(error).toBeUndefined();
      expect(value.UPLOADS_PATH).toBe('uploads');
    });

    it('should fail validation when required environment variables are missing', () => {
      const invalidEnv = {
        JWT_ACCESS_SECRET: 'access-secret',
      };

      const { error } = validationSchema.validate(invalidEnv);
      expect(error).toBeDefined();
    });
  });

  describe('Throttler Config', () => {
    it('should have predefined throttler configurations', () => {
      expect(throttlerConfig).toBeDefined();
      expect(Array.isArray(throttlerConfig)).toBe(true);
      expect(throttlerConfig).toHaveLength(3);
    });
  });

  describe('Upload Factories', () => {
    it('should create FileUploadService instances with appropriate configs', () => {
      const avatarService = avatarUploadService.useFactory();
      const establishmentService = establishmentUploadService.useFactory();
      const featureService = featureUploadService.useFactory();

      expect(avatarService).toBeDefined();
      expect(establishmentService).toBeDefined();
      expect(featureService).toBeDefined();
    });
  });

  describe('AuthResponseDto', () => {
    it('should instantiate AuthResponseDto correctly', () => {
      const dto = new AuthResponseDto();
      dto.accessToken = 'access_123';
      dto.refreshToken = 'refresh_123';

      expect(dto.accessToken).toBe('access_123');
      expect(dto.refreshToken).toBe('refresh_123');
    });
  });
});
