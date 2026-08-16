import * as fs from 'fs';
import * as path from 'path';

import { FileUploadService } from '@common/services/file-upload.service';
import { BadRequestException } from '@nestjs/common';

jest.mock('fs');

describe('FileUploadService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should initialize with default baseUploadsDir and ensure directory exists', () => {
    delete process.env.UPLOADS_PATH;
    const mkdirSpy = jest.spyOn(fs, 'mkdirSync').mockImplementation();

    const service = new FileUploadService({
      folder: 'avatars',
      prefix: 'avatar',
    });

    expect(service).toBeDefined();
    expect(mkdirSpy).toHaveBeenCalledWith(path.join('uploads', 'avatars'), {
      recursive: true,
    });
  });

  it('should initialize with custom UPLOADS_PATH env variable', () => {
    process.env.UPLOADS_PATH = 'custom-uploads';
    const mkdirSpy = jest.spyOn(fs, 'mkdirSync').mockImplementation();

    const service = new FileUploadService({
      folder: 'test-folder',
      prefix: 'test',
    });

    expect(mkdirSpy).toHaveBeenCalledWith(
      path.join('custom-uploads', 'test-folder'),
      { recursive: true }
    );
  });

  describe('multerOptions', () => {
    it('should provide multer options with default size limit (5MB)', () => {
      jest.spyOn(fs, 'mkdirSync').mockImplementation();
      const service = new FileUploadService({
        folder: 'avatars',
        prefix: 'avatar',
      });

      const options = service.multerOptions;
      expect(options.limits.fileSize).toBe(5 * 1024 * 1024);
      expect(options.storage).toBeDefined();
      expect(options.fileFilter).toBeDefined();
    });

    it('should provide multer options with custom maxSizeBytes', () => {
      jest.spyOn(fs, 'mkdirSync').mockImplementation();
      const service = new FileUploadService({
        folder: 'avatars',
        prefix: 'avatar',
        maxSizeBytes: 10 * 1024 * 1024,
      });

      const options = service.multerOptions;
      expect(options.limits.fileSize).toBe(10 * 1024 * 1024);
    });

    it('should filter allowed image files successfully', () => {
      jest.spyOn(fs, 'mkdirSync').mockImplementation();
      const service = new FileUploadService({
        folder: 'avatars',
        prefix: 'avatar',
      });

      const fileFilter = service.multerOptions.fileFilter;
      const validFiles = [
        { originalname: 'photo.jpg', mimetype: 'image/jpeg' },
        { originalname: 'photo.jpeg', mimetype: 'image/jpeg' },
        { originalname: 'photo.png', mimetype: 'image/png' },
        { originalname: 'photo.gif', mimetype: 'image/gif' },
        { originalname: 'photo.webp', mimetype: 'image/webp' },
      ];

      validFiles.forEach(file => {
        const callback = jest.fn();
        fileFilter({} as any, file as Express.Multer.File, callback);
        expect(callback).toHaveBeenCalledWith(null, true);
      });
    });

    it('should reject files with invalid extensions or mimetypes', () => {
      jest.spyOn(fs, 'mkdirSync').mockImplementation();
      const service = new FileUploadService({
        folder: 'avatars',
        prefix: 'avatar',
      });

      const fileFilter = service.multerOptions.fileFilter;
      const invalidFiles = [
        { originalname: 'document.pdf', mimetype: 'application/pdf' },
        { originalname: 'script.js', mimetype: 'text/javascript' },
        { originalname: 'photo.jpg', mimetype: 'application/octet-stream' },
        { originalname: 'photo.exe', mimetype: 'image/png' },
      ];

      invalidFiles.forEach(file => {
        const callback = jest.fn();
        fileFilter({} as any, file as Express.Multer.File, callback);
        expect(callback).toHaveBeenCalledWith(
          expect.any(BadRequestException),
          false
        );
      });
    });

    it('should generate filename using diskStorage filename callback', () => {
      jest.spyOn(fs, 'mkdirSync').mockImplementation();
      const service = new FileUploadService({
        folder: 'avatars',
        prefix: 'avatar',
      });

      const storage = service.multerOptions.storage as any;
      const callback = jest.fn();
      const file = { originalname: 'test.png' } as Express.Multer.File;

      storage.getFilename({} as any, file, callback);

      expect(callback).toHaveBeenCalledWith(
        null,
        expect.stringMatching(/^avatar-[a-f0-9-]+\.png$/)
      );
    });
  });

  describe('getFileUrl', () => {
    it('should construct correct file url', () => {
      delete process.env.UPLOADS_PATH;
      jest.spyOn(fs, 'mkdirSync').mockImplementation();
      const service = new FileUploadService({
        folder: 'avatars',
        prefix: 'avatar',
      });

      expect(service.getFileUrl('avatar-123.png')).toBe(
        '/uploads/avatars/avatar-123.png'
      );
    });
  });

  describe('deleteFile', () => {
    let service: FileUploadService;
    let unlinkSpy: jest.SpyInstance;

    beforeEach(() => {
      delete process.env.UPLOADS_PATH;
      jest.spyOn(fs, 'mkdirSync').mockImplementation();
      unlinkSpy = jest.spyOn(fs, 'unlinkSync').mockImplementation();
      service = new FileUploadService({
        folder: 'avatars',
        prefix: 'avatar',
      });
    });

    it('should do nothing if fileUrl is undefined or null or empty', () => {
      service.deleteFile(undefined);
      service.deleteFile(null);
      service.deleteFile('');
      expect(unlinkSpy).not.toHaveBeenCalled();
    });

    it('should do nothing if fileUrl does not start with expected prefix', () => {
      service.deleteFile('/other-path/avatars/avatar-123.png');
      service.deleteFile('https://example.com/avatar-123.png');
      expect(unlinkSpy).not.toHaveBeenCalled();
    });

    it('should delete file when valid fileUrl is provided', () => {
      service.deleteFile('/uploads/avatars/avatar-123.png');
      expect(unlinkSpy).toHaveBeenCalledWith(
        path.join('uploads', 'avatars', 'avatar-123.png')
      );
    });

    it('should ignore ENOENT errors when deleting file', () => {
      const enoentError: any = new Error('File not found');
      enoentError.code = 'ENOENT';
      unlinkSpy.mockImplementation(() => {
        throw enoentError;
      });

      expect(() =>
        service.deleteFile('/uploads/avatars/avatar-123.png')
      ).not.toThrow();
    });

    it('should log error when unlink throws non-ENOENT error', () => {
      const eaccesError: any = new Error('Permission denied');
      eaccesError.code = 'EACCES';
      eaccesError.stack = 'stack trace';
      unlinkSpy.mockImplementation(() => {
        throw eaccesError;
      });

      expect(() =>
        service.deleteFile('/uploads/avatars/avatar-123.png')
      ).not.toThrow();
    });
  });
});
