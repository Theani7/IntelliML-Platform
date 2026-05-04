import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as api from './api';

describe('API Library', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('getApiBaseUrl should return proxy path', () => {
    expect(api.getApiBaseUrl()).toBe('/api/proxy');
  });

  it('testGroqConnection should handle success', async () => {
    const mockResponse = { status: 'success', message: 'Working', response: 'OK' };
    
    const fetchSpy = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response)
    );
    vi.stubGlobal('fetch', fetchSpy);

    const result = await api.testGroqConnection();
    expect(result.status).toBe('success');
    expect(fetchSpy).toHaveBeenCalled();
  });

  it('testGroqConnection should handle failure gracefully', async () => {
    const fetchSpy = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({ error: 'Failed' }),
      } as Response)
    );
    vi.stubGlobal('fetch', fetchSpy);

    const result = await api.testGroqConnection();
    expect(result.status).toBe('unavailable');
  });
});
