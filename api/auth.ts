import { authApi } from './axios';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  first_name: string;
  last_name: string;
  age?: number;
  role: 'student' | 'teacher';
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface UserResponse {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  age?: number;
  phone_number?: string;
  country?: string;
  bio?: string;
  role: 'student' | 'teacher';
  avatar?: string;
  avatar_url?: string;
  banner_url?: string;
  name?: string;
}

export interface UserUpdateData {
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  age?: number;
  phone_number?: string;
  country?: string;
  bio?: string;
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const formData = new URLSearchParams();
    formData.append('username', credentials.email);
    formData.append('password', credentials.password);
    
    const response = await authApi.post<AuthResponse>('/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response.data;
  },

  async register(userData: RegisterData): Promise<UserResponse> {
    const response = await authApi.post<UserResponse>('/auth/register', userData);
    return response.data;
  },

  async getCurrentUser(): Promise<UserResponse> {
    const response = await authApi.get<UserResponse>('/users/me');
    return response.data;
  },

  async updateProfile(userData: UserUpdateData): Promise<UserResponse> {
    const response = await authApi.put<UserResponse>('/users/me', userData);
    return response.data;
  },

  async uploadAvatar(file: File): Promise<{ avatar_url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await authApi.post<{ avatar_url: string }>('/users/me/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async uploadBanner(file: File): Promise<{ banner_url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await authApi.post<{ banner_url: string }>('/users/me/banner', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

