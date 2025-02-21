import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, role: 'teacher' | 'student') => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      set({ user: session?.user || null, loading: false });

      // Set up auth state change listener
      supabase.auth.onAuthStateChange((_event, session) => {
        set({ user: session?.user || null });
      });
    } catch (error) {
      console.error('Error initializing auth:', error);
      set({ loading: false });
    }
  },
  signIn: async (email: string, password: string) => {
    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    set({ user: data.user });
  },
  signUp: async (email: string, password: string, role: 'teacher' | 'student') => {
    // First sign up the user
    const { error: signUpError, data } = await supabase.auth.signUp({
      email,
      password,
    });
    if (signUpError) throw signUpError;

    if (data.user) {
      try {
        // Then create the user profile
        const { error: insertError } = await supabase.from('users').upsert({
          id: data.user.id,
          email,
          role,
          preferred_language: 'en',
        }, {
          onConflict: 'id'
        });

        if (insertError) {
          console.error('Error creating user profile:', insertError);
          // If profile creation fails, delete the auth user
          await supabase.auth.admin.deleteUser(data.user.id);
          throw new Error('Failed to create user profile');
        }

        set({ user: data.user });
      } catch (error) {
        console.error('Error in signup process:', error);
        throw error;
      }
    }
  },
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    set({ user: null });
  },
}));