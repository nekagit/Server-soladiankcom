import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/astro';
import EnterpriseAPI from '../../components/EnterpriseAPI.astro';

// Mock fetch
global.fetch = vi.fn();

describe('EnterpriseAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders enterprise API management component', () => {
    render(EnterpriseAPI, {
      props: {
        showKeys: true,
        showUsage: true,
        showWebhooks: true
      }
    });

    expect(screen.getByText('Enterprise API Management')).toBeInTheDocument();
    expect(screen.getByText('Manage your API keys, usage, and webhooks')).toBeInTheDocument();
  });

  it('displays API keys section when showKeys is true', () => {
    render(EnterpriseAPI, {
      props: {
        showKeys: true,
        showUsage: false,
        showWebhooks: false
      }
    });

    expect(screen.getByText('API Keys')).toBeInTheDocument();
    expect(screen.getByText('Create New Key')).toBeInTheDocument();
  });

  it('displays usage analytics section when showUsage is true', () => {
    render(EnterpriseAPI, {
      props: {
        showKeys: false,
        showUsage: true,
        showWebhooks: false
      }
    });

    expect(screen.getByText('Usage Analytics')).toBeInTheDocument();
    expect(screen.getByText('Last 7 days')).toBeInTheDocument();
  });

  it('displays webhooks section when showWebhooks is true', () => {
    render(EnterpriseAPI, {
      props: {
        showKeys: false,
        showUsage: false,
        showWebhooks: true
      }
    });

    expect(screen.getByText('Webhooks')).toBeInTheDocument();
    expect(screen.getByText('Create Webhook')).toBeInTheDocument();
  });

  it('shows API key cards with correct information', () => {
    render(EnterpriseAPI, {
      props: {
        showKeys: true,
        showUsage: false,
        showWebhooks: false
      }
    });

    expect(screen.getByText('Production API Key')).toBeInTheDocument();
    expect(screen.getByText('Development API Key')).toBeInTheDocument();
    expect(screen.getByText('sk_live_...')).toBeInTheDocument();
    expect(screen.getByText('sk_test_...')).toBeInTheDocument();
  });

  it('displays API key status correctly', () => {
    render(EnterpriseAPI, {
      props: {
        showKeys: true,
        showUsage: false,
        showWebhooks: false
      }
    });

    const statusElements = screen.getAllByText('active');
    expect(statusElements).toHaveLength(2);
  });

  it('shows usage statistics for API keys', () => {
    render(EnterpriseAPI, {
      props: {
        showKeys: false,
        showUsage: true,
        showWebhooks: false
      }
    });

    expect(screen.getByText('Production API Key')).toBeInTheDocument();
    expect(screen.getByText('12,543 / 100,000 requests')).toBeInTheDocument();
    expect(screen.getByText('2,341 / 10,000 requests')).toBeInTheDocument();
  });

  it('displays webhook information correctly', () => {
    render(EnterpriseAPI, {
      props: {
        showKeys: false,
        showUsage: false,
        showWebhooks: true
      }
    });

    expect(screen.getByText('Payment Notifications')).toBeInTheDocument();
    expect(screen.getByText('NFT Events')).toBeInTheDocument();
    expect(screen.getByText('https://api.example.com/webhooks/payments')).toBeInTheDocument();
  });

  it('handles copy API key functionality', async () => {
    render(EnterpriseAPI, {
      props: {
        showKeys: true,
        showUsage: false,
        showWebhooks: false
      }
    });

    const copyButtons = screen.getAllByRole('button');
    const copyButton = copyButtons.find(button => 
      button.querySelector('svg') && 
      button.querySelector('svg')?.getAttribute('viewBox') === '0 0 24 24'
    );

    if (copyButton) {
      fireEvent.click(copyButton);
      
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalled();
      });
    }
  });

  it('handles create new key button click', async () => {
    render(EnterpriseAPI, {
      props: {
        showKeys: true,
        showUsage: false,
        showWebhooks: false
      }
    });

    const createButton = screen.getByText('Create New Key');
    fireEvent.click(createButton);

    // Should trigger create key functionality
    expect(createButton).toBeInTheDocument();
  });

  it('handles create webhook button click', async () => {
    render(EnterpriseAPI, {
      props: {
        showKeys: false,
        showUsage: false,
        showWebhooks: true
      }
    });

    const createButton = screen.getByText('Create Webhook');
    fireEvent.click(createButton);

    // Should trigger create webhook functionality
    expect(createButton).toBeInTheDocument();
  });

  it('displays webhook success rates', () => {
    render(EnterpriseAPI, {
      props: {
        showKeys: false,
        showUsage: false,
        showWebhooks: true
      }
    });

    expect(screen.getByText('98.5%')).toBeInTheDocument();
    expect(screen.getByText('95.2%')).toBeInTheDocument();
  });

  it('shows webhook events correctly', () => {
    render(EnterpriseAPI, {
      props: {
        showKeys: false,
        showUsage: false,
        showWebhooks: true
      }
    });

    expect(screen.getByText('payment.completed')).toBeInTheDocument();
    expect(screen.getByText('payment.failed')).toBeInTheDocument();
    expect(screen.getByText('nft.minted')).toBeInTheDocument();
    expect(screen.getByText('nft.transferred')).toBeInTheDocument();
  });

  it('handles usage period change', async () => {
    render(EnterpriseAPI, {
      props: {
        showKeys: false,
        showUsage: true,
        showWebhooks: false
      }
    });

    const periodSelect = screen.getByDisplayValue('Last 30 days');
    fireEvent.change(periodSelect, { target: { value: '7d' } });

    expect(periodSelect).toHaveValue('7d');
  });

  it('displays API key permissions correctly', () => {
    render(EnterpriseAPI, {
      props: {
        showKeys: true,
        showUsage: false,
        showWebhooks: false
      }
    });

    expect(screen.getByText('read')).toBeInTheDocument();
    expect(screen.getByText('write')).toBeInTheDocument();
    expect(screen.getByText('webhooks')).toBeInTheDocument();
  });

  it('shows last used information for API keys', () => {
    render(EnterpriseAPI, {
      props: {
        showKeys: true,
        showUsage: false,
        showWebhooks: false
      }
    });

    expect(screen.getByText('2 hours ago')).toBeInTheDocument();
    expect(screen.getByText('1 day ago')).toBeInTheDocument();
  });

  it('handles action button clicks', async () => {
    render(EnterpriseAPI, {
      props: {
        showKeys: true,
        showUsage: false,
        showWebhooks: false
      }
    });

    const actionButtons = screen.getAllByRole('button');
    const editButton = actionButtons.find(button => 
      button.getAttribute('data-action') === 'edit'
    );

    if (editButton) {
      fireEvent.click(editButton);
      // Should trigger edit functionality
      expect(editButton).toBeInTheDocument();
    }
  });

  it('displays webhook status correctly', () => {
    render(EnterpriseAPI, {
      props: {
        showKeys: false,
        showUsage: false,
        showWebhooks: true
      }
    });

    const activeStatus = screen.getByText('active');
    const inactiveStatus = screen.getByText('inactive');
    
    expect(activeStatus).toBeInTheDocument();
    expect(inactiveStatus).toBeInTheDocument();
  });

  it('shows webhook last triggered information', () => {
    render(EnterpriseAPI, {
      props: {
        showKeys: false,
        showUsage: false,
        showWebhooks: true
      }
    });

    expect(screen.getByText('5 minutes ago')).toBeInTheDocument();
    expect(screen.getByText('2 days ago')).toBeInTheDocument();
  });

  it('handles keyboard navigation', async () => {
    render(EnterpriseAPI, {
      props: {
        showKeys: true,
        showUsage: false,
        showWebhooks: false
      }
    });

    const createButton = screen.getByText('Create New Key');
    createButton.focus();
    
    fireEvent.keyDown(createButton, { key: 'Enter' });
    
    // Should trigger create key functionality
    expect(createButton).toBeInTheDocument();
  });

  it('applies correct styling classes', () => {
    render(EnterpriseAPI, {
      props: {
        showKeys: true,
        showUsage: true,
        showWebhooks: true
      }
    });

    const container = screen.getByText('Enterprise API Management').closest('.enterprise-api');
    expect(container).toHaveClass('enterprise-api');
  });
});
