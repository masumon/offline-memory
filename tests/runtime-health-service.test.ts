import { collectRuntimeHealth } from '../src/services/runtime-health-service';
import { Platform } from 'react-native';

jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn().mockResolvedValue({ granted: true, canAskAgain: true }),
  getAllScheduledNotificationsAsync: jest.fn().mockResolvedValue([]),
}));

describe('runtime health service', () => {
  it('reports database and notification health without mutation', async () => {
    const db = { getFirstAsync: jest.fn().mockResolvedValue({ ok: 1 }) } as never;
    await expect(collectRuntimeHealth(db)).resolves.toEqual({
      platform: Platform.OS === 'web' ? 'web' : 'android',
      notifications: 'granted',
      scheduledNotificationCount: 0,
      databaseReadable: true,
    });
  });
});
