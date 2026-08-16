import { OptionalJwtAuthGuard } from '@common/guard/jwt-optional-auth.guard';

describe('OptionalJwtAuthGuard', () => {
  let guard: OptionalJwtAuthGuard;

  beforeEach(() => {
    guard = new OptionalJwtAuthGuard();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should return user when user is provided', () => {
    const mockUser = { id: 1, email: 'test@example.com' };
    const result = guard.handleRequest(null, mockUser, null, {} as any);
    expect(result).toBe(mockUser);
  });

  it('should return undefined or null without throwing even if error exists', () => {
    const error = new Error('Unauthorized');
    const result = guard.handleRequest(error, null, null, {} as any);
    expect(result).toBeNull();
  });
});
