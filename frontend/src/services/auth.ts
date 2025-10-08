/**
 * Authentication API service
 */

import { apiService, ApiResponse } from './api';

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar?: string;
  created_at: string;
  updated_at: string;
  wallet_address?: string;
  wallet_type?: 'phantom' | 'solflare' | 'backpack';
}

export interface LoginRequest {
  email: string;
  password: string;
  remember_me?: boolean;
}

export interface RegisterRequest {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  confirm_password: string;
}

export interface WalletAuthRequest {
  wallet_address: string;
  wallet_type: 'phantom' | 'solflare' | 'backpack';
  signature?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refresh_token: string;
  expires_in: number;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirmRequest {
  token: string;
  password: string;
  confirm_password: string;
}

export class AuthService {
  /**
   * Login with email and password
   */
  async login(credentials: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    const response = await apiService.post<AuthResponse>('/auth/login', credentials);
    
    if (response.success && response.data) {
      apiService.setToken(response.data.token);
    }
    
    return response;
  }

  /**
   * Register new user
   */
  async register(userData: RegisterRequest): Promise<ApiResponse<AuthResponse>> {
    const response = await apiService.post<AuthResponse>('/auth/register', userData);
    
    if (response.success && response.data) {
      apiService.setToken(response.data.token);
    }
    
    return response;
  }

  /**
   * Login with Solana wallet
   */
  async loginWithWallet(walletData: WalletAuthRequest): Promise<ApiResponse<AuthResponse>> {
    const response = await apiService.post<AuthResponse>('/auth/wallet', walletData);
    
    if (response.success && response.data) {
      apiService.setToken(response.data.token);
    }
    
    return response;
  }

  /**
   * Logout user
   */
  async logout(): Promise<ApiResponse<void>> {
    const response = await apiService.post<void>('/auth/logout');
    
    if (response.success) {
      apiService.clearToken();
    }
    
    return response;
  }

  /**
   * Get current user profile
   */
  async getProfile(): Promise<ApiResponse<User>> {
    return apiService.get<User>('/auth/profile');
  }

  /**
   * Update user profile
   */
  async updateProfile(userData: Partial<User>): Promise<ApiResponse<User>> {
    return apiService.put<User>('/auth/profile', userData);
  }

  /**
   * Change password
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<void>> {
    return apiService.post<void>('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<ApiResponse<void>> {
    return apiService.post<void>('/auth/password-reset', { email });
  }

  /**
   * Confirm password reset
   */
  async confirmPasswordReset(token: string, password: string): Promise<ApiResponse<void>> {
    return apiService.post<void>('/auth/password-reset/confirm', {
      token,
      password,
    });
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(): Promise<ApiResponse<AuthResponse>> {
    const response = await apiService.post<AuthResponse>('/auth/refresh');
    
    if (response.success && response.data) {
      apiService.setToken(response.data.token);
    }
    
    return response;
  }

  /**
   * Verify email address
   */
  async verifyEmail(token: string): Promise<ApiResponse<void>> {
    return apiService.post<void>('/auth/verify-email', { token });
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(): Promise<ApiResponse<void>> {
    return apiService.post<void>('/auth/resend-verification');
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!apiService['token'];
  }

  /**
   * Get current user from localStorage
   */
  getCurrentUser(): User | null {
    if (typeof window === 'undefined') return null;
    
    const userStr = localStorage.getItem('current_user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch (error) {
        console.error('Failed to parse user data:', error);
        return null;
      }
    }
    
    return null;
  }

  /**
   * Set current user in localStorage
   */
  setCurrentUser(user: User): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('current_user', JSON.stringify(user));
    }
  }

  /**
   * Clear current user from localStorage
   */
  clearCurrentUser(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('current_user');
    }
  }
}

// Create singleton instance
export const authService = new AuthService();



