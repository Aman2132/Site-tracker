import { MOCK_NETWORK_DELAY_MS } from '@/constants/config';

/**
 * Simulates network latency so loading states in controllers/screens behave
 * the way they will once api/* calls a real HTTP client instead of resolving
 * from src/constants/mockData.ts.
 */
export function withNetworkDelay<T>(value: T, delayMs: number = MOCK_NETWORK_DELAY_MS): Promise<T> {
  return new Promise(resolve => setTimeout(() => resolve(value), delayMs));
}
