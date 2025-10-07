/**
 * Authentication Service
 * Mobile authentication service with biometric support
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { BiometricAuth } from 'react-native-biometrics';
import DeviceInfo from 'react-native-device-info';

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  acceptTerms: boolean;
  marketingConsent?: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  banner?: string;
  bio?: string;
  walletAddress?: string;
  verified: boolean;
  createdAt: number;
  updatedAt: number;
  preferences: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    currency: string;
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
      marketing: boolean;
      security: boolean;
      updates: boolean;
    };
    privacy: {
      profileVisibility: 'public' | 'private' | 'friends';
      showEmail: boolean;
      showWallet: boolean;
      showActivity: boolean;
      allowMessages: boolean;
    };
  };
  stats: {
    nftsOwned: number;
    nftsCreated: number;
    collectionsCreated: number;
    totalSpent: number;
    totalEarned: number;
    followers: number;
    following: number;
    reputation: number;
  };
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  sessionExpiry?: number;
  error?: string;
}

class AuthService {
  private readonly API_BASE_URL = 'https://api.soladia.com';
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'user_data';
  private readonly BIOMETRIC_KEY = 'biometric_enabled';

  /**
   * Login with email and password
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const deviceInfo = await this.getDeviceInfo();
      
      const response = await fetch(`${this.API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...credentials,
          deviceInfo,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || 'Login failed',
        };
      }

      // Store token and user data
      await this.storeAuthData(data.token, data.user);

      return {
        success: true,
        user: data.user,
        token: data.token,
        sessionExpiry: data.sessionExpiry,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
      };
    }
  }

  /**
   * Login with wallet
   */
  async loginWithWallet(walletType: 'phantom' | 'solflare' | 'backpack'): Promise<AuthResponse> {
    try {
      // This would integrate with actual wallet connection
      // For now, we'll simulate the process
      const deviceInfo = await this.getDeviceInfo();
      
      const response = await fetch(`${this.API_BASE_URL}/auth/wallet-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletType,
          deviceInfo,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || 'Wallet login failed',
        };
      }

      // Store token and user data
      await this.storeAuthData(data.token, data.user);

      return {
        success: true,
        user: data.user,
        token: data.token,
        sessionExpiry: data.sessionExpiry,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Wallet login failed',
      };
    }
  }

  /**
   * Register new user
   */
  async register(userData: RegisterData): Promise<AuthResponse> {
    try {
      const deviceInfo = await this.getDeviceInfo();
      
      const response = await fetch(`${this.API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...userData,
          deviceInfo,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || 'Registration failed',
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      };
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      const token = await this.getToken();
      
      if (token) {
        await fetch(`${this.API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage
      await this.clearAuthData();
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: Partial<User>): Promise<AuthResponse> {
    try {
      const token = await this.getToken();
      
      if (!token) {
        return {
          success: false,
          error: 'Not authenticated',
        };
      }

      const response = await fetch(`${this.API_BASE_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || 'Profile update failed',
        };
      }

      // Update stored user data
      await this.storeUserData(data.user);

      return {
        success: true,
        user: data.user,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Profile update failed',
      };
    }
  }

  /**
   * Change password
   */
  async changePassword(passwordData: {
    currentPassword: string;
    newPassword: string;
  }): Promise<AuthResponse> {
    try {
      const token = await this.getToken();
      
      if (!token) {
        return {
          success: false,
          error: 'Not authenticated',
        };
      }

      const response = await fetch(`${this.API_BASE_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(passwordData),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || 'Password change failed',
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Password change failed',
      };
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || 'Password reset request failed',
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Password reset request failed',
      };
    }
  }

  /**
   * Verify email
   */
  async verifyEmail(token: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/auth/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || 'Email verification failed',
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Email verification failed',
      };
    }
  }

  /**
   * Enable biometric authentication
   */
  async enableBiometric(): Promise<boolean> {
    try {
      const biometric = new BiometricAuth();
      const { available } = await biometric.isSensorAvailable();
      
      if (!available) {
        throw new Error('Biometric authentication not available');
      }

      const { success } = await biometric.createKeys();
      if (!success) {
        throw new Error('Failed to create biometric keys');
      }

      await AsyncStorage.setItem(this.BIOMETRIC_KEY, 'true');
      return true;
    } catch (error) {
      console.error('Failed to enable biometric:', error);
      return false;
    }
  }

  /**
   * Authenticate with biometric
   */
  async authenticateWithBiometric(): Promise<boolean> {
    try {
      const biometric = new BiometricAuth();
      const { success } = await biometric.authenticate({
        promptMessage: 'Authenticate with biometric',
        fallbackPromptMessage: 'Use passcode',
      });

      return success;
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      return false;
    }
  }

  /**
   * Check if biometric is enabled
   */
  async isBiometricEnabled(): Promise<boolean> {
    try {
      const enabled = await AsyncStorage.getItem(this.BIOMETRIC_KEY);
      return enabled === 'true';
    } catch (error) {
      return false;
    }
  }

  /**
   * Get stored token
   */
  async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(this.TOKEN_KEY);
    } catch (error) {
      return null;
    }
  }

  /**
   * Get stored user data
   */
  async getUser(): Promise<User | null> {
    try {
      const userData = await AsyncStorage.getItem(this.USER_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    return !!token;
  }

  /**
   * Store authentication data
   */
  private async storeAuthData(token: string, user: User): Promise<void> {
    await Promise.all([
      AsyncStorage.setItem(this.TOKEN_KEY, token),
      AsyncStorage.setItem(this.USER_KEY, JSON.stringify(user)),
    ]);
  }

  /**
   * Store user data
   */
  private async storeUserData(user: User): Promise<void> {
    await AsyncStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  /**
   * Clear authentication data
   */
  private async clearAuthData(): Promise<void> {
    await Promise.all([
      AsyncStorage.removeItem(this.TOKEN_KEY),
      AsyncStorage.removeItem(this.USER_KEY),
    ]);
  }

  /**
   * Get device information
   */
  private async getDeviceInfo(): Promise<any> {
    try {
      const deviceId = await DeviceInfo.getUniqueId();
      const deviceName = await DeviceInfo.getDeviceName();
      const systemName = await DeviceInfo.getSystemName();
      const systemVersion = await DeviceInfo.getSystemVersion();
      const appVersion = await DeviceInfo.getVersion();
      const buildNumber = await DeviceInfo.getBuildNumber();

      return {
        deviceId,
        deviceName,
        systemName,
        systemVersion,
        appVersion,
        buildNumber,
        platform: 'mobile',
      };
    } catch (error) {
      return {
        platform: 'mobile',
      };
    }
  }
}

export const authService = new AuthService();
