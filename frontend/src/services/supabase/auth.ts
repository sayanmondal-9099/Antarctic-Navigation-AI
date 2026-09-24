import { supabase, isSupabaseConfigured } from './config';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';

export type UserRole = 'COMMAND_CENTER' | 'NAVIGATOR' | 'CAPTAIN' | 'SCIENTIST';

export interface AppUser {
  uid: string;
  email: string;
  role: UserRole;
  isDemo?: boolean;
  assignedVesselId?: string;
  token?: string;
}

// In Demo / Offline mode, we maintain a synthetic mock state
let demoUser: AppUser | null = null;
type AuthStateObserver = (user: AppUser | null) => void;
const observers: AuthStateObserver[] = [];

function notifyObservers(user: AppUser | null) {
  observers.forEach(obs => obs(user));
}

export const getRoleFromEmail = (email: string | null): UserRole => {
  if (!email) return 'NAVIGATOR';
  const lower = email.toLowerCase();
  if (lower.includes('admin') || lower.includes('command')) return 'COMMAND_CENTER';
  if (lower.includes('captain')) return 'CAPTAIN';
  if (lower.includes('science') || lower.includes('scientist')) return 'SCIENTIST';
  return 'NAVIGATOR';
};

const mapSupabaseUserToAppUser = (user: SupabaseUser, session?: Session | null): AppUser => {
  const meta = user.user_metadata || {};
  const role: UserRole = meta.role || getRoleFromEmail(user.email ?? null);
  const assignedVesselId = meta.assigned_vessel_id || (role === 'CAPTAIN' ? 'vessel-A' : undefined);

  return {
    uid: user.id,
    email: user.email || '',
    role,
    assignedVesselId,
    token: session?.access_token,
    isDemo: false
  };
};

export const onAuthStateChanged = (callback: AuthStateObserver) => {
  if (isSupabaseConfigured && supabase) {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        callback(mapSupabaseUserToAppUser(session.user, session));
      } else {
        callback(null);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        callback(mapSupabaseUserToAppUser(session.user, session));
      } else {
        callback(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  } else {
    // Offline / Demo Mode Observer
    observers.push(callback);
    callback(demoUser);
    return () => {
      const idx = observers.indexOf(callback);
      if (idx > -1) observers.splice(idx, 1);
    };
  }
};

export const signIn = async (email: string, password: string): Promise<AppUser> => {
  const isDemoAccount = email.toLowerCase().includes('demo.local') || !isSupabaseConfigured;

  if (isSupabaseConfigured && supabase && !isDemoAccount) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.user || !data.session) {
      throw new Error('Authentication succeeded but session is missing.');
    }

    return mapSupabaseUserToAppUser(data.user, data.session);
  } else {
    // Demo / Offline Mode Login
    return new Promise((resolve) => {
      setTimeout(() => {
        const role = getRoleFromEmail(email);
        const assignedVessel = role === 'CAPTAIN' ? 'vessel-A' : undefined;
        demoUser = {
          uid: `demo-${role.toLowerCase()}-123`,
          email: email,
          role: role,
          assignedVesselId: assignedVessel,
          isDemo: true,
          token: `DEMO_TOKEN_${role}_${assignedVessel || 'vessel-A'}`
        };
        notifyObservers(demoUser);
        resolve(demoUser);
      }, 300);
    });
  }
};

export const signOut = async (): Promise<void> => {
  if (isSupabaseConfigured && supabase) {
    await supabase.auth.signOut();
  } else {
    // Demo Mode Logout
    return new Promise((resolve) => {
      setTimeout(() => {
        demoUser = null;
        notifyObservers(null);
        resolve();
      }, 150);
    });
  }
};

// Current bearer access token provider for API requests
export const getAuthToken = async (): Promise<string | null> => {
  if (isSupabaseConfigured && supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      return session.access_token;
    }
  }
  if (demoUser) {
    return demoUser.token || null;
  }
  return null;
};
