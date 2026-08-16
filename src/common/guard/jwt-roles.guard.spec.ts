import { ROLES_KEY } from '@common/decorator/roles.decorator';
import { RolesGuard } from '@common/guard/jwt-roles.guard';
import { UserRole } from '@modules/users/entities/user.entity';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockContext = (user?: any): ExecutionContext =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          user,
        }),
      }),
    }) as any;

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should return true if no roles are required on the handler/class', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);
    const context = createMockContext();

    const result = guard.canActivate(context);

    expect(result).toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
  });

  it('should throw UnauthorizedException if roles are required but user is not authenticated', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([UserRole.OWNER, UserRole.SUPER_ADMIN]);
    const context = createMockContext(undefined);

    expect(() => guard.canActivate(context)).toThrow(
      new UnauthorizedException('User not authenticated')
    );
  });

  it('should return true if user role is included in required roles', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([UserRole.OWNER, UserRole.SUPER_ADMIN]);
    const context = createMockContext({ role: UserRole.OWNER });

    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should return false if user role is not included in required roles', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([UserRole.OWNER, UserRole.SUPER_ADMIN]);
    const context = createMockContext({ role: UserRole.USER });

    const result = guard.canActivate(context);

    expect(result).toBe(false);
  });
});
