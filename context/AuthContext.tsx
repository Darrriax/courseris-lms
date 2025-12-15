import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User } from '../types';
import { authService, LoginCredentials, RegisterData, UserResponse as ApiUserResponse } from '../api/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to convert API user response to frontend User type
const mapApiUserToUser = (apiUser: ApiUserResponse): User => {
  return {
    id: apiUser.id,
    name: apiUser.name || `${apiUser.first_name} ${apiUser.last_name}`,
    avatar: apiUser.avatar_url || apiUser.avatar || `https://picsum.photos/seed/${apiUser.email}/100/100`,
    email: apiUser.email,
    role: apiUser.role,
    gender: apiUser.gender,
  };
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    try {
      const apiUser = await authService.getCurrentUser();
      const mappedUser = mapApiUserToUser(apiUser);
      setUser(mappedUser);
      localStorage.setItem('user', JSON.stringify(mappedUser));
    } catch (error) {
      // If refresh fails, keep existing user; errors will surface in the caller if needed
      throw error;
    }
  }, []);

  // Check for existing token and load user on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          await refreshProfile();
        } catch (error) {
          // Token invalid, clear it
          localStorage.removeItem('access_token');
          localStorage.removeItem('user');
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      const authResponse = await authService.login(credentials);
      localStorage.setItem('access_token', authResponse.access_token);
      
      // Fetch user info
      await refreshProfile();
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Login failed. Please try again.';
      throw new Error(errorMessage);
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      await authService.register(userData);

      // Automatically log in after registration
      const loginResponse = await authService.login({
        email: userData.email,
        password: userData.password,
      });
      
      localStorage.setItem('access_token', loginResponse.access_token);
      await refreshProfile();
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Registration failed. Please try again.';
      throw new Error(errorMessage);
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};