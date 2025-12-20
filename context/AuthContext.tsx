import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  is_authorized: boolean;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthorized: boolean;
  hasName: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  isLoading: true,
  isAuthorized: false,
  hasName: false,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
  };

  useEffect(() => {
    console.log('[AuthContext] Initializing...');
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log('[AuthContext] Session loaded:', session ? 'Yes' : 'No');
      if (error) console.error('[AuthContext] Session error:', error);
      if (session?.user) {
        console.log('[AuthContext] User ID:', session.user.id);
        console.log('[AuthContext] User email:', session.user.email);
      } else {
        console.log('[AuthContext] No user in session');
      }

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        console.log('[AuthContext] Fetching profile for user:', session.user.id);
        fetchProfile(session.user.id).then((profileData) => {
          console.log('[AuthContext] Profile fetched:', profileData);
          setProfile(profileData);
        });
      }

      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AuthContext] Auth state changed:', event);
      console.log('[AuthContext] New session:', session ? 'Yes' : 'No');

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        console.log('[AuthContext] Fetching profile after auth change');
        fetchProfile(session.user.id).then((profileData) => {
          console.log('[AuthContext] Profile after auth change:', profileData);
          setProfile(profileData);
        });
      } else {
        setProfile(null);
      }

      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    console.log('[AuthContext] Starting signOut...');
    try {
      console.log('[AuthContext] Calling supabase.auth.signOut()');
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('[AuthContext] Supabase signOut error:', error);
        throw error;
      }

      console.log('[AuthContext] Supabase signOut successful, clearing state');
      setSession(null);
      setUser(null);
      setProfile(null);
      console.log('[AuthContext] State cleared, signOut complete');
    } catch (error) {
      console.error('[AuthContext] Error during signOut:', error);
      throw error;
    }
  };

  const isAuthorized = profile?.is_authorized ?? false;
  const hasName = !!profile?.full_name && profile.full_name.trim().length > 0;

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        isLoading,
        isAuthorized,
        hasName,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
