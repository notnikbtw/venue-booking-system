import { EstablishmentOwnerGuard } from '@common/guard/establishment-owner.guard';
import { Establishment } from '@modules/establishment/entities/establishment.entity';
import { UserRole } from '@modules/users/entities/user.entity';
import {
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

describe('EstablishmentOwnerGuard', () => {
  let guard: EstablishmentOwnerGuard;
  let establishmentRepository: Repository<Establishment>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EstablishmentOwnerGuard,
        {
          provide: getRepositoryToken(Establishment),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<EstablishmentOwnerGuard>(EstablishmentOwnerGuard);
    establishmentRepository = module.get<Repository<Establishment>>(
      getRepositoryToken(Establishment)
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockContext = (
    user: any,
    params: { id: string }
  ): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          user,
          params,
        }),
      }),
    }) as any;

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow SUPER_ADMIN without querying establishment', async () => {
    const context = createMockContext(
      { id: 1, role: UserRole.SUPER_ADMIN },
      { id: '10' }
    );

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(establishmentRepository.findOne).not.toHaveBeenCalled();
  });

  it('should throw NotFoundException if establishment does not exist', async () => {
    const context = createMockContext(
      { id: 2, role: UserRole.OWNER },
      { id: '10' }
    );
    jest.spyOn(establishmentRepository, 'findOne').mockResolvedValue(null);

    await expect(guard.canActivate(context)).rejects.toThrow(
      new NotFoundException('Establishment 10 not found')
    );
    expect(establishmentRepository.findOne).toHaveBeenCalledWith({
      where: { id: 10 },
    });
  });

  it('should throw ForbiddenException if user is not the owner of the establishment', async () => {
    const context = createMockContext(
      { id: 2, role: UserRole.OWNER },
      { id: '10' }
    );
    const mockEstablishment = {
      id: 10,
      ownerId: 5,
    } as Establishment;

    jest
      .spyOn(establishmentRepository, 'findOne')
      .mockResolvedValue(mockEstablishment);

    await expect(guard.canActivate(context)).rejects.toThrow(
      new ForbiddenException('You do not own this establishment')
    );
  });

  it('should allow access if user is the owner of the establishment', async () => {
    const context = createMockContext(
      { id: 5, role: UserRole.OWNER },
      { id: '10' }
    );
    const mockEstablishment = {
      id: 10,
      ownerId: 5,
    } as Establishment;

    jest
      .spyOn(establishmentRepository, 'findOne')
      .mockResolvedValue(mockEstablishment);

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(establishmentRepository.findOne).toHaveBeenCalledWith({
      where: { id: 10 },
    });
  });
});
