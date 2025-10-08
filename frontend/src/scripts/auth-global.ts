// Global authentication script
// This ensures auth manager is available on all pages

import { authManager } from '../services/auth-manager';

// Make auth manager globally available
if (typeof window !== 'undefined') {
    (window as any).authManager = authManager;

    // Also add convenience methods
    (window as any).login = (email: string, password: string) => authManager.login(email, password);
    (window as any).logout = () => authManager.logout();
    (window as any).getCurrentUser = () => authManager.getCurrentUser();
    (window as any).isAuthenticated = () => authManager.isAuthenticated();

    console.log('Auth manager loaded globally');
}
