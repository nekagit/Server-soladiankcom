import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/astro';
import AIRecommendations from '../../components/AIRecommendations.astro';

// Mock fetch
global.fetch = vi.fn();

describe('AIRecommendations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders AI recommendations component', () => {
    render(AIRecommendations, {
      props: {
        userId: 'test-user',
        category: 'nft',
        limit: 6
      }
    });

    expect(screen.getByText('AI Recommendations')).toBeInTheDocument();
    expect(screen.getByText('Powered by machine learning')).toBeInTheDocument();
  });

  it('displays trending recommendations by default', () => {
    render(AIRecommendations, {
      props: {
        userId: 'test-user',
        category: 'nft',
        limit: 6
      }
    });

    expect(screen.getByText('Trending')).toBeInTheDocument();
    expect(screen.getByText('For You')).toBeInTheDocument();
    expect(screen.getByText('Price Drops')).toBeInTheDocument();
  });

  it('switches between tabs when clicked', async () => {
    render(AIRecommendations, {
      props: {
        userId: 'test-user',
        category: 'nft',
        limit: 6
      }
    });

    const forYouTab = screen.getByText('For You');
    fireEvent.click(forYouTab);

    await waitFor(() => {
      expect(forYouTab).toHaveClass('active');
    });
  });

  it('displays recommendation cards with correct data', () => {
    render(AIRecommendations, {
      props: {
        userId: 'test-user',
        category: 'nft',
        limit: 6
      }
    });

    // Check for trending items
    expect(screen.getByText('CryptoPunk #1234')).toBeInTheDocument();
    expect(screen.getByText('2.5 SOL')).toBeInTheDocument();
    expect(screen.getByText('+15%')).toBeInTheDocument();
  });

  it('handles refresh recommendations', async () => {
    render(AIRecommendations, {
      props: {
        userId: 'test-user',
        category: 'nft',
        limit: 6
      }
    });

    const refreshButton = screen.getByText('Refresh Recommendations');
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(screen.getByText('Refreshing...')).toBeInTheDocument();
    });
  });

  it('displays confidence scores for personalized recommendations', async () => {
    render(AIRecommendations, {
      props: {
        userId: 'test-user',
        category: 'nft',
        limit: 6
      }
    });

    const forYouTab = screen.getByText('For You');
    fireEvent.click(forYouTab);

    await waitFor(() => {
      expect(screen.getByText('85% match')).toBeInTheDocument();
      expect(screen.getByText('92% match')).toBeInTheDocument();
    });
  });

  it('shows price drop indicators', async () => {
    render(AIRecommendations, {
      props: {
        userId: 'test-user',
        category: 'nft',
        limit: 6
      }
    });

    const priceDropsTab = screen.getByText('Price Drops');
    fireEvent.click(priceDropsTab);

    await waitFor(() => {
      expect(screen.getByText('-33%')).toBeInTheDocument();
    });
  });

  it('handles empty recommendations gracefully', () => {
    render(AIRecommendations, {
      props: {
        userId: 'test-user',
        category: 'nft',
        limit: 0
      }
    });

    expect(screen.getByText('AI Recommendations')).toBeInTheDocument();
  });

  it('applies correct styling classes', () => {
    render(AIRecommendations, {
      props: {
        userId: 'test-user',
        category: 'nft',
        limit: 6
      }
    });

    const container = screen.getByText('AI Recommendations').closest('.ai-recommendations');
    expect(container).toHaveClass('ai-recommendations');
  });

  it('handles tab switching with keyboard navigation', async () => {
    render(AIRecommendations, {
      props: {
        userId: 'test-user',
        category: 'nft',
        limit: 6
      }
    });

    const trendingTab = screen.getByText('Trending');
    trendingTab.focus();
    
    fireEvent.keyDown(trendingTab, { key: 'Enter' });
    
    await waitFor(() => {
      expect(trendingTab).toHaveClass('active');
    });
  });

  it('displays recommendation reasons for personalized items', async () => {
    render(AIRecommendations, {
      props: {
        userId: 'test-user',
        category: 'nft',
        limit: 6
      }
    });

    const forYouTab = screen.getByText('For You');
    fireEvent.click(forYouTab);

    await waitFor(() => {
      expect(screen.getByText('Based on your interest in abstract art')).toBeInTheDocument();
      expect(screen.getByText('Similar to your gaming collection')).toBeInTheDocument();
    });
  });
});
