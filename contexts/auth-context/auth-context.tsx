import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthApi } from '@/api/auth';
import { IAuthPayload, IRegisterPayload } from '@/api/auth/types';
import { IUser } from '@/types/user';
import { IApiResponse } from '@/api/types';

interface IAuthContext {
  signIn: (payload: IAuthPayload) => Promise<IApiResponse<{ token: string; user: IUser }>>;
  signUp: (payload: IRegisterPayload) => Promise<IApiResponse<{ token: string; user: IUser }>>;
  signOut: () => Promise<void>;
  session: {
    token: string | null;
    user: IUser | null;
  } | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<IAuthContext | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

const authApi = new AuthApi();

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<{
    token: string | null;
    user: IUser | null;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    restoreSession();
  }, []);

  const restoreSession = async () => {
    try {
      setIsLoading(true);

      const [token, userData] = await Promise.all([
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem('user')
      ]);

      if (token && userData) {
        const response = await authApi.validateToken({
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.state && response.data?.valid) {
          const user: IUser = JSON.parse(userData);
          setSession({ token, user });
        } else {
          await AsyncStorage.multiRemove(['token', 'user']);
        }
      }
    } catch (error) {
      await AsyncStorage.multiRemove(['token', 'user']);
    } finally {
      setIsLoading(false);
    }
  };

  const saveAuthData = async (token: string, user: IUser) => {
    await AsyncStorage.multiSet([
      ['token', token],
      ['user', JSON.stringify(user)]
    ]);
  };

  const clearAuthData = async () => {
    await AsyncStorage.multiRemove(['token', 'user']);
  };

  const signIn = async (payload: IAuthPayload): Promise<IApiResponse<{ token: string; user: IUser }>> => {
    const response = await authApi.login(payload);


    if (response.state && response.data) {
      const { token, user } = response.data;
      await saveAuthData(token, user);
      setSession({ token, user });
      router.replace('/');
    }

    return response;
  };

  const signUp = async (payload: IRegisterPayload): Promise<IApiResponse<{ token: string; user: IUser }>> => {
    const response = await authApi.register(payload);

    if (response.state && response.data) {
      const { token, user } = response.data;
      await saveAuthData(token, user);
      setSession({ token, user });
      router.replace('/');
    }

    return response;
  };

  const signOut = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await clearAuthData();
      setSession(null);
      router.push('/sign-in');
    }
  };

  const value: IAuthContext = {
    signIn,
    signUp,
    signOut,
    session,
    isLoading,
    isAuthenticated: !!session?.token,
  };

  if (isLoading) {
    return null;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
