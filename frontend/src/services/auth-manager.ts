/**
 * Centralized Authentication Manager
 * Handles authentication state across the entire application
 */

export interface User {
    id: string;
    username: string;
    email: string;
    full_name?: string;
    avatar?: string;
    role?: string;
    created_at?: string;
    updated_at?: string;
}

export interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
}

class AuthManager {
    private state: AuthState = {
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
    };

    private listeners: Set<(state: AuthState) => void> = new Set();

    constructor() {
        this.loadAuthStateFromStorage();
        this.setupEventListeners();
    }

    /**
     * Load authentication state from localStorage
     */
    private loadAuthStateFromStorage(): void {
        try {
            const token = localStorage.getItem('auth_token');
            const userData = localStorage.getItem('user_data');

            if (token && userData) {
                const user = JSON.parse(userData);
                this.state = {
                    user,
                    isAuthenticated: true,
                    isLoading: false,
                    error: null,
                };
            }
        } catch (error) {
            console.error('Failed to load auth state from storage:', error);
            this.clearAuthState();
        }
    }

    /**
     * Setup event listeners
     */
    private setupEventListeners(): void {
        // Listen for storage changes (e.g., from other tabs)
        window.addEventListener('storage', (e) => {
            if (e.key === 'auth_token' || e.key === 'user_data') {
                this.loadAuthStateFromStorage();
                this.notifyListeners();
            }
        });

        // Listen for custom auth events
        window.addEventListener('authStateChanged', () => {
            this.loadAuthStateFromStorage();
            this.notifyListeners();
        });
    }

    /**
     * Subscribe to auth state changes
     */
    public subscribe(listener: (state: AuthState) => void): () => void {
        this.listeners.add(listener);

        // Return unsubscribe function
        return () => {
            this.listeners.delete(listener);
        };
    }

    /**
     * Notify all listeners of state changes
     */
    private notifyListeners(): void {
        this.listeners.forEach(listener => listener({ ...this.state }));
    }

    /**
     * Get current authentication state
     */
    public getState(): AuthState {
        return { ...this.state };
    }

    /**
     * Check if user is authenticated
     */
    public isAuthenticated(): boolean {
        return this.state.isAuthenticated && !!this.state.user;
    }

    /**
     * Get current user
     */
    public getCurrentUser(): User | null {
        return this.state.user;
    }

    /**
     * Set authentication state
     */
    public setAuthState(user: User, token: string): void {
        this.state = {
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
        };

        // Store in localStorage
        localStorage.setItem('auth_token', token);
        localStorage.setItem('user_data', JSON.stringify(user));

        this.notifyListeners();
    }

    /**
     * Clear authentication state
     */
    public clearAuthState(): void {
        this.state = {
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
        };

        // Clear localStorage
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');

        this.notifyListeners();
    }

    /**
     * Set loading state
     */
    public setLoading(loading: boolean): void {
        this.state.isLoading = loading;
        this.notifyListeners();
    }

    /**
     * Set error state
     */
    public setError(error: string | null): void {
        this.state.error = error;
        this.notifyListeners();
    }

    /**
     * Verify authentication with server
     */
    public async verifyAuth(): Promise<boolean> {
        const token = localStorage.getItem('auth_token');

        if (!token) {
            this.clearAuthState();
            return false;
        }

        try {
            this.setLoading(true);

            const response = await fetch('/api/auth/profile', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const userData = await response.json();
                this.setAuthState(userData, token);
                return true;
            } else {
                this.clearAuthState();
                return false;
            }
        } catch (error) {
            console.error('Auth verification failed:', error);
            this.clearAuthState();
            return false;
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * Login user
     */
    public async login(email: string, password: string): Promise<boolean> {
        try {
            this.setLoading(true);
            this.setError(null);

            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            if (response.ok) {
                const data = await response.json();
                this.setAuthState(data.user, data.access_token);
                return true;
            } else {
                const errorData = await response.json();
                this.setError(errorData.detail || 'Login failed');
                return false;
            }
        } catch (error) {
            this.setError('Login failed. Please check your connection and try again.');
            return false;
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * Logout user
     */
    public async logout(): Promise<void> {
        try {
            const token = localStorage.getItem('auth_token');

            if (token) {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
            }
        } catch (error) {
            console.error('Logout API call failed:', error);
        } finally {
            this.clearAuthState();
        }
    }

    /**
     * Get auth token
     */
    public getToken(): string | null {
        return localStorage.getItem('auth_token');
    }

    /**
     * Check if user has specific role
     */
    public hasRole(role: string): boolean {
        return this.state.user?.role === role;
    }

    /**
     * Check if user is admin
     */
    public isAdmin(): boolean {
        return this.hasRole('admin');
    }
}

// Create singleton instance
export const authManager = new AuthManager();

// Make auth manager globally available
if (typeof window !== 'undefined') {
    (window as any).authManager = authManager;
}
