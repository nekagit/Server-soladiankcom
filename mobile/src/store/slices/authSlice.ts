/**
 * Authentication Slice
 * Redux slice for authentication state management
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { authService } from '../../services/authService';
import { BiometricAuth } from 'react-native-biometrics';

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

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  biometricEnabled: boolean;
  sessionExpiry: number | null;
  lastActivity: number;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  biometricEnabled: false,
  sessionExpiry: null,
  lastActivity: 0,
};

// Async thunks
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; password: string; rememberMe?: boolean }) => {
    const response = await authService.login(credentials);
    return response;
  }
);

export const loginWithWallet = createAsyncThunk(
  'auth/loginWithWallet',
  async (walletType: 'phantom' | 'solflare' | 'backpack') => {
    const response = await authService.loginWithWallet(walletType);
    return response;
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (userData: {
    email: string;
    password: string;
    name: string;
    acceptTerms: boolean;
    marketingConsent?: boolean;
  }) => {
    const response = await authService.register(userData);
    return response;
  }
);

export const logout = createAsyncThunk('auth/logout', async () => {
  await authService.logout();
});

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (updates: Partial<User>) => {
    const response = await authService.updateProfile(updates);
    return response;
  }
);

export const changePassword = createAsyncThunk(
  'auth/changePassword',
  async (passwordData: { currentPassword: string; newPassword: string }) => {
    const response = await authService.changePassword(passwordData);
    return response;
  }
);

export const enableBiometric = createAsyncThunk(
  'auth/enableBiometric',
  async () => {
    const biometric = new BiometricAuth();
    const { available } = await biometric.isSensorAvailable();
    
    if (!available) {
      throw new Error('Biometric authentication not available');
    }

    const { success } = await biometric.createKeys();
    if (!success) {
      throw new Error('Failed to create biometric keys');
    }

    return true;
  }
);

export const authenticateWithBiometric = createAsyncThunk(
  'auth/authenticateWithBiometric',
  async () => {
    const biometric = new BiometricAuth();
    const { success } = await biometric.authenticate({
      promptMessage: 'Authenticate with biometric',
      fallbackPromptMessage: 'Use passcode',
    });

    if (!success) {
      throw new Error('Biometric authentication failed');
    }

    return true;
  }
);

export const checkBiometricStatus = createAsyncThunk(
  'auth/checkBiometricStatus',
  async () => {
    const biometric = new BiometricAuth();
    const { available } = await biometric.isSensorAvailable();
    const { success } = await biometric.biometricKeysExist();
    
    return {
      available,
      enabled: success,
    };
  }
);

// Auth slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    updateLastActivity: (state) => {
      state.lastActivity = Date.now();
    },
    setBiometricEnabled: (state, action: PayloadAction<boolean>) => {
      state.biometricEnabled = action.payload;
    },
    setSessionExpiry: (state, action: PayloadAction<number | null>) => {
      state.sessionExpiry = action.payload;
    },
    resetAuth: () => initialState,
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.sessionExpiry = action.payload.sessionExpiry;
        state.lastActivity = Date.now();
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Login failed';
      });

    // Login with wallet
    builder
      .addCase(loginWithWallet.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginWithWallet.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.sessionExpiry = action.payload.sessionExpiry;
        state.lastActivity = Date.now();
        state.error = null;
      })
      .addCase(loginWithWallet.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Wallet login failed';
      });

    // Register
    builder
      .addCase(register.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Registration failed';
      });

    // Logout
    builder
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.sessionExpiry = null;
        state.lastActivity = 0;
        state.error = null;
      });

    // Update profile
    builder
      .addCase(updateProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.error = null;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Profile update failed';
      });

    // Change password
    builder
      .addCase(changePassword.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(changePassword.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Password change failed';
      });

    // Enable biometric
    builder
      .addCase(enableBiometric.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(enableBiometric.fulfilled, (state) => {
        state.isLoading = false;
        state.biometricEnabled = true;
        state.error = null;
      })
      .addCase(enableBiometric.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to enable biometric';
      });

    // Authenticate with biometric
    builder
      .addCase(authenticateWithBiometric.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(authenticateWithBiometric.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(authenticateWithBiometric.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Biometric authentication failed';
      });

    // Check biometric status
    builder
      .addCase(checkBiometricStatus.fulfilled, (state, action) => {
        state.biometricEnabled = action.payload.available && action.payload.enabled;
      });
  },
});

export const {
  clearError,
  updateLastActivity,
  setBiometricEnabled,
  setSessionExpiry,
  resetAuth,
} = authSlice.actions;

export default authSlice.reducer;
