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

  const ensureProfileExists = async (authUser: User) => {
    try {
      const fallbackName = String(
        authUser.user_metadata?.full_name || authUser.user_metadata?.name || ''
      ).trim();

      const { error } = await supabase
        .from('profiles')
        .insert({
          id: authUser.id,
          email: authUser.email || '',
          full_name: fallbackName || null,
          avatar_url: null,
          is_authorized: false,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Error ensuring profile exists:', error);
      }
    } catch (error) {
      console.error('Error ensuring profile exists:', error);
    }
  };

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

      if (!data) {
        const currentUser = (await supabase.auth.getUser()).data.user;
        if (currentUser && currentUser.id === userId) {
          await ensureProfileExists(currentUser);

          const { data: recreatedProfile, error: refetchError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

          if (refetchError) {
            console.error('Error fetching recreated profile:', refetchError);
            return null;
          }

          return recreatedProfile;
        }
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
  const profileName = profile?.full_name?.trim() || '';
  const metadataName = String(user?.user_metadata?.full_name || user?.user_metadata?.name || '').trim();
  const hasName = profileName.length > 0 || metadataName.length > 0;

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
