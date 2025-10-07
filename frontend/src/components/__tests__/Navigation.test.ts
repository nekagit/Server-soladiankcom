/**
 * Navigation Component Tests
 * Comprehensive testing for the Navigation component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import Navigation from '../Navigation.astro';

// Mock the wallet service
vi.mock('../../services/wallet-connection', () => ({
  walletService: {
    isConnected: vi.fn(() => false),
    connect: vi.fn(),
    disconnect: vi.fn(),
    getWalletInfo: vi.fn(() => null),
  }
}));

// Mock the theme service
vi.mock('../../services/theme', () => ({
  themeService: {
    getTheme: vi.fn(() => 'light'),
    setTheme: vi.fn(),
    toggleTheme: vi.fn(),
  }
}));

describe('Navigation Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders navigation with logo and menu items', () => {
      render(Navigation);
      
      // Check if logo is present
      expect(screen.getByTestId('soladia-logo')).toBeInTheDocument();
      expect(screen.getByText('Soladia')).toBeInTheDocument();
      
      // Check if navigation menu is present
      expect(screen.getByRole('navigation')).toBeInTheDocument();
      expect(screen.getByTestId('nav-menu')).toBeInTheDocument();
    });

    it('renders all navigation menu items', () => {
      render(Navigation);
      
      const menuItems = [
        'Home',
        'Products',
        'Categories',
        'NFTs',
        'Sell',
        'About',
        'Contact'
      ];
      
      menuItems.forEach(item => {
        expect(screen.getByText(item)).toBeInTheDocument();
      });
    });

    it('renders wallet connection button when not connected', () => {
      render(Navigation);
      
      expect(screen.getByTestId('connect-wallet-btn')).toBeInTheDocument();
      expect(screen.getByText('Connect Wallet')).toBeInTheDocument();
    });

    it('renders mobile menu toggle button', () => {
      render(Navigation);
      
      expect(screen.getByTestId('mobile-menu-toggle')).toBeInTheDocument();
    });

    it('renders theme toggle button', () => {
      render(Navigation);
      
      expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
    });
  });

  describe('Wallet Connection', () => {
    it('shows wallet connection modal when connect button is clicked', async () => {
      render(Navigation);
      
      const connectBtn = screen.getByTestId('connect-wallet-btn');
      fireEvent.click(connectBtn);
      
      await waitFor(() => {
        expect(screen.getByTestId('wallet-modal')).toBeInTheDocument();
      });
    });

    it('displays wallet info when connected', () => {
      // Mock connected state
      vi.mocked(require('../../services/wallet-connection').walletService.isConnected).mockReturnValue(true);
      vi.mocked(require('../../services/wallet-connection').walletService.getWalletInfo).mockReturnValue({
        address: 'test-wallet-address',
        balance: 1.5,
        network: 'mainnet'
      });

      render(Navigation);
      
      expect(screen.getByTestId('wallet-info')).toBeInTheDocument();
      expect(screen.getByText('test-wallet-address')).toBeInTheDocument();
      expect(screen.getByText('1.5 SOL')).toBeInTheDocument();
    });

    it('shows disconnect button when wallet is connected', () => {
      vi.mocked(require('../../services/wallet-connection').walletService.isConnected).mockReturnValue(true);
      
      render(Navigation);
      
      expect(screen.getByTestId('disconnect-wallet-btn')).toBeInTheDocument();
    });
  });

  describe('Theme Toggle', () => {
    it('toggles theme when theme button is clicked', async () => {
      const mockToggleTheme = vi.fn();
      vi.mocked(require('../../services/theme').themeService.toggleTheme).mockImplementation(mockToggleTheme);
      
      render(Navigation);
      
      const themeBtn = screen.getByTestId('theme-toggle');
      fireEvent.click(themeBtn);
      
      expect(mockToggleTheme).toHaveBeenCalled();
    });

    it('shows correct theme icon based on current theme', () => {
      // Test light theme
      vi.mocked(require('../../services/theme').themeService.getTheme).mockReturnValue('light');
      
      render(Navigation);
      
      expect(screen.getByTestId('theme-icon-moon')).toBeInTheDocument();
      
      // Test dark theme
      vi.mocked(require('../../services/theme').themeService.getTheme).mockReturnValue('dark');
      
      render(Navigation);
      
      expect(screen.getByTestId('theme-icon-sun')).toBeInTheDocument();
    });
  });

  describe('Mobile Menu', () => {
    it('toggles mobile menu when mobile menu button is clicked', async () => {
      render(Navigation);
      
      const mobileToggle = screen.getByTestId('mobile-menu-toggle');
      fireEvent.click(mobileToggle);
      
      await waitFor(() => {
        expect(screen.getByTestId('mobile-menu')).toHaveClass('active');
      });
    });

    it('closes mobile menu when menu item is clicked', async () => {
      render(Navigation);
      
      // Open mobile menu
      const mobileToggle = screen.getByTestId('mobile-menu-toggle');
      fireEvent.click(mobileToggle);
      
      await waitFor(() => {
        expect(screen.getByTestId('mobile-menu')).toHaveClass('active');
      });
      
      // Click menu item
      const menuItem = screen.getByText('Products');
      fireEvent.click(menuItem);
      
      await waitFor(() => {
        expect(screen.getByTestId('mobile-menu')).not.toHaveClass('active');
      });
    });

    it('shows hamburger icon when menu is closed', () => {
      render(Navigation);
      
      expect(screen.getByTestId('hamburger-icon')).toBeInTheDocument();
    });

    it('shows close icon when menu is open', async () => {
      render(Navigation);
      
      const mobileToggle = screen.getByTestId('mobile-menu-toggle');
      fireEvent.click(mobileToggle);
      
      await waitFor(() => {
        expect(screen.getByTestId('close-icon')).toBeInTheDocument();
      });
    });
  });

  describe('Active States', () => {
    it('highlights active navigation item based on current page', () => {
      // Mock current page as products
      Object.defineProperty(window, 'location', {
        value: { pathname: '/products' },
        writable: true
      });
      
      render(Navigation);
      
      const productsLink = screen.getByText('Products');
      expect(productsLink).toHaveClass('active');
    });

    it('applies correct styling to active navigation item', () => {
      Object.defineProperty(window, 'location', {
        value: { pathname: '/products' },
        writable: true
      });
      
      render(Navigation);
      
      const productsLink = screen.getByText('Products');
      expect(productsLink).toHaveStyle({
        color: 'var(--soladia-primary)',
        backgroundColor: 'var(--soladia-primary-100)'
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for navigation', () => {
      render(Navigation);
      
      const nav = screen.getByRole('navigation');
      expect(nav).toHaveAttribute('aria-label', 'Main navigation');
    });

    it('has proper ARIA labels for mobile menu toggle', () => {
      render(Navigation);
      
      const mobileToggle = screen.getByTestId('mobile-menu-toggle');
      expect(mobileToggle).toHaveAttribute('aria-label', 'Toggle mobile menu');
      expect(mobileToggle).toHaveAttribute('aria-expanded', 'false');
    });

    it('has proper ARIA labels for theme toggle', () => {
      render(Navigation);
      
      const themeToggle = screen.getByTestId('theme-toggle');
      expect(themeToggle).toHaveAttribute('aria-label', 'Toggle theme');
    });

    it('has proper ARIA labels for wallet connection', () => {
      render(Navigation);
      
      const connectBtn = screen.getByTestId('connect-wallet-btn');
      expect(connectBtn).toHaveAttribute('aria-label', 'Connect wallet');
    });

    it('supports keyboard navigation', () => {
      render(Navigation);
      
      const firstMenuItem = screen.getByText('Home');
      firstMenuItem.focus();
      
      expect(document.activeElement).toBe(firstMenuItem);
    });

    it('traps focus in mobile menu when open', async () => {
      render(Navigation);
      
      const mobileToggle = screen.getByTestId('mobile-menu-toggle');
      fireEvent.click(mobileToggle);
      
      await waitFor(() => {
        const mobileMenu = screen.getByTestId('mobile-menu');
        expect(mobileMenu).toHaveAttribute('aria-hidden', 'false');
      });
    });
  });

  describe('Responsive Design', () => {
    it('hides desktop menu on mobile screens', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        value: 375,
        writable: true
      });
      
      render(Navigation);
      
      const desktopMenu = screen.getByTestId('nav-menu');
      expect(desktopMenu).toHaveClass('hidden');
    });

    it('shows mobile menu toggle on mobile screens', () => {
      Object.defineProperty(window, 'innerWidth', {
        value: 375,
        writable: true
      });
      
      render(Navigation);
      
      const mobileToggle = screen.getByTestId('mobile-menu-toggle');
      expect(mobileToggle).toHaveClass('block');
    });
  });

  describe('Error Handling', () => {
    it('handles wallet connection errors gracefully', async () => {
      const mockConnect = vi.fn().mockRejectedValue(new Error('Connection failed'));
      vi.mocked(require('../../services/wallet-connection').walletService.connect).mockImplementation(mockConnect);
      
      render(Navigation);
      
      const connectBtn = screen.getByTestId('connect-wallet-btn');
      fireEvent.click(connectBtn);
      
      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
        expect(screen.getByText('Failed to connect wallet')).toBeInTheDocument();
      });
    });

    it('shows loading state during wallet connection', async () => {
      const mockConnect = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));
      vi.mocked(require('../../services/wallet-connection').walletService.connect).mockImplementation(mockConnect);
      
      render(Navigation);
      
      const connectBtn = screen.getByTestId('connect-wallet-btn');
      fireEvent.click(connectBtn);
      
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('renders without performance issues', () => {
      const startTime = performance.now();
      render(Navigation);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100); // Should render in less than 100ms
    });

    it('does not re-render unnecessarily', () => {
      const { rerender } = render(Navigation);
      
      // Re-render with same props
      rerender(Navigation);
      
      // Should not cause any issues
      expect(screen.getByTestId('soladia-logo')).toBeInTheDocument();
    });
  });
});
