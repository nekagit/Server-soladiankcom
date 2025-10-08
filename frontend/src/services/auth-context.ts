/**
 * Authentication context and state management
 */

import { authService, User } from './auth';

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: {
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    password: string;
    confirm_password: string;
  }) => Promise<boolean>;
  loginWithWallet: (walletData: {
    wallet_address: string;
    wallet_type: 'phantom' | 'solflare' | 'backpack';
    signature?: string;
  }) => Promise<boolean>;
  logout: () => Promise<void>;
  updateProfile: (userData: Partial<User>) => Promise<boolean>;
  clearError: () => void;
  refreshUser: () => Promise<void>;
}

class AuthManager {
  private state: AuthState = {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  };

  private listeners: Array<(state: AuthState) => void> = [];

  constructor() {
    this.initializeAuth();
  }

  private initializeAuth(): void {
    this.state.isLoading = true;
    
    // Check if user is already authenticated
    const user = authService.getCurrentUser();
    const isAuthenticated = authService.isAuthenticated();
    
    if (user && isAuthenticated) {
      this.state.user = user;
      this.state.isAuthenticated = true;
    }
    
    this.state.isLoading = false;
    this.notifyListeners();
  }

  public subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state));
  }

  public getState(): AuthState {
    return { ...this.state };
  }

  public async login(email: string, password: string): Promise<boolean> {
    this.setState({ isLoading: true, error: null });

    try {
      const response = await authService.login({ email, password });
      
      if (response.success && response.data) {
        this.setState({
          user: response.data.user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        
        authService.setCurrentUser(response.data.user);
        return true;
      } else {
        this.setState({
          isLoading: false,
          error: response.error || 'Login failed',
        });
        return false;
      }
    } catch (error) {
      this.setState({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Login failed',
      });
      return false;
    }
  }

  public async register(userData: {
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    password: string;
    confirm_password: string;
  }): Promise<boolean> {
    this.setState({ isLoading: true, error: null });

    try {
      const response = await authService.register(userData);
      
      if (response.success && response.data) {
        this.setState({
          user: response.data.user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        
        authService.setCurrentUser(response.data.user);
        return true;
      } else {
        this.setState({
          isLoading: false,
          error: response.error || 'Registration failed',
        });
        return false;
      }
    } catch (error) {
      this.setState({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      });
      return false;
    }
  }

  public async loginWithWallet(walletData: {
    wallet_address: string;
    wallet_type: 'phantom' | 'solflare' | 'backpack';
    signature?: string;
  }): Promise<boolean> {
    this.setState({ isLoading: true, error: null });

    try {
      const response = await authService.loginWithWallet(walletData);
      
      if (response.success && response.data) {
        this.setState({
          user: response.data.user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        
        authService.setCurrentUser(response.data.user);
        return true;
      } else {
        this.setState({
          isLoading: false,
          error: response.error || 'Wallet login failed',
        });
        return false;
      }
    } catch (error) {
      this.setState({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Wallet login failed',
      });
      return false;
    }
  }

  public async logout(): Promise<void> {
    this.setState({ isLoading: true });

    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
      
      authService.clearCurrentUser();
    }
  }

  public async updateProfile(userData: Partial<User>): Promise<boolean> {
    this.setState({ isLoading: true, error: null });

    try {
      const response = await authService.updateProfile(userData);
      
      if (response.success && response.data) {
        this.setState({
          user: response.data,
          isLoading: false,
          error: null,
        });
        
        authService.setCurrentUser(response.data);
        return true;
      } else {
        this.setState({
          isLoading: false,
          error: response.error || 'Profile update failed',
        });
        return false;
      }
    } catch (error) {
      this.setState({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Profile update failed',
      });
      return false;
    }
  }

  public clearError(): void {
    this.setState({ error: null });
  }

  public async refreshUser(): Promise<void> {
    if (!this.state.isAuthenticated) return;

    this.setState({ isLoading: true });

    try {
      const response = await authService.getProfile();
      
      if (response.success && response.data) {
        this.setState({
          user: response.data,
          isLoading: false,
        });
        
        authService.setCurrentUser(response.data);
      } else {
        // If profile fetch fails, user might be logged out
        this.logout();
      }
    } catch (error) {
      console.error('Refresh user error:', error);
      this.logout();
    }
  }

  private setState(updates: Partial<AuthState>): void {
    this.state = { ...this.state, ...updates };
    this.notifyListeners();
  }
}

// Create singleton instance
export const authManager = new AuthManager();

// Export context type for TypeScript
export type { AuthContextType, AuthState };



