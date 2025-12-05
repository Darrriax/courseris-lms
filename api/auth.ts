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
  age?: number;
  role: 'student' | 'teacher';
  avatar?: string;
  name?: string;
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
    const response = await authApi.get<UserResponse>('/auth/me');
    return response.data;
  },
};

