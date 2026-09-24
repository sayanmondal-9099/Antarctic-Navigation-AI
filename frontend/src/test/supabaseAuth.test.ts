import { describe, it, expect, beforeEach } from 'vitest';
import { getRoleFromEmail, signIn, signOut, getAuthToken } from '../services/supabase/auth';

describe('Supabase Authentication Service', () => {
  beforeEach(async () => {
    await signOut();
  });

  it('maps emails to polar roles deterministically', () => {
    expect(getRoleFromEmail('command@antarctic.org')).toBe('COMMAND_CENTER');
    expect(getRoleFromEmail('admin@polar.gov')).toBe('COMMAND_CENTER');
    expect(getRoleFromEmail('captain.smith@ship.org')).toBe('CAPTAIN');
    expect(getRoleFromEmail('scientist.jane@nsf.gov')).toBe('SCIENTIST');
    expect(getRoleFromEmail('navigator.bob@fleet.org')).toBe('NAVIGATOR');
    expect(getRoleFromEmail(null)).toBe('NAVIGATOR');
  });

  it('signs in with demo accounts in offline mode', async () => {
    const user = await signIn('captain.test@demo.local', 'password123');
    expect(user).toBeDefined();
    expect(user.role).toBe('CAPTAIN');
    expect(user.isDemo).toBe(true);
    expect(user.assignedVesselId).toBe('vessel-A');
    expect(user.token).toContain('DEMO_TOKEN_CAPTAIN');

    const token = await getAuthToken();
    expect(token).toBe(user.token);
  });

  it('signs out properly and clears session in offline mode', async () => {
    await signIn('navigator@demo.local', 'password123');
    expect(await getAuthToken()).toBeTruthy();

    await signOut();
    expect(await getAuthToken()).toBeNull();
  });
});
