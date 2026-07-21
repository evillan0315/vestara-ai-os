import { vi } from 'vitest';

const mockUser = {
  id: 'test-user-1',
  name: 'Test User',
  email: 'test@vestara.ai',
  role: 'admin',
};

const mockAuthValue = {
  user: mockUser,
  token: 'mock-token',
  loading: false,
  login: vi.fn().mockRejectedValue(new Error('mock login')),
  autoLogin: vi.fn().mockRejectedValue(new Error('mock auto-login')),
  logout: vi.fn(),
};

export { mockUser, mockAuthValue };
