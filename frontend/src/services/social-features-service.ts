/**
 * Social Features Service
 * User profiles, following, social feed, and community features
 */

import { productionAuthService } from './production-auth-service';
import { productionNFTMarketplace } from './production-nft-marketplace';

export interface SocialUser {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatar: string;
  banner: string;
  verified: boolean;
  followers: number;
  following: number;
  nftsOwned: number;
  nftsCreated: number;
  totalValue: number;
  reputation: number;
  badges: string[];
  socialLinks: {
    twitter?: string;
    discord?: string;
    website?: string;
  };
  createdAt: number;
  lastActive: number;
  isFollowing?: boolean;
  isBlocked?: boolean;
}

export interface SocialPost {
  id: string;
  author: SocialUser;
  content: string;
  images?: string[];
  nft?: {
    id: string;
    name: string;
    image: string;
    collection: string;
    price?: number;
    currency?: string;
  };
  type: 'text' | 'nft_showcase' | 'collection_showcase' | 'achievement' | 'marketplace_update';
  likes: number;
  comments: number;
  shares: number;
  isLiked: boolean;
  isShared: boolean;
  createdAt: number;
  updatedAt: number;
  visibility: 'public' | 'followers' | 'private';
  tags: string[];
}

export interface SocialComment {
  id: string;
  postId: string;
  author: SocialUser;
  content: string;
  likes: number;
  isLiked: boolean;
  createdAt: number;
  updatedAt: number;
  replies: SocialComment[];
}

export interface SocialFeed {
  posts: SocialPost[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  filters: {
    type?: string;
    author?: string;
    tags?: string[];
    dateRange?: {
      start: number;
      end: number;
    };
  };
}

export interface SocialNotification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'nft_sale' | 'achievement';
  from: SocialUser;
  to: string;
  content: string;
  data: any;
  read: boolean;
  createdAt: number;
}

export interface SocialState {
  currentUser: SocialUser | null;
  feed: SocialFeed | null;
  notifications: SocialNotification[];
  following: SocialUser[];
  followers: SocialUser[];
  suggestions: SocialUser[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: number;
}

export interface SocialError {
  code: string;
  message: string;
  details?: any;
  retryable: boolean;
  timestamp: number;
}

export class SocialFeaturesService {
  private state: SocialState = {
    currentUser: null,
    feed: null,
    notifications: [],
    following: [],
    followers: [],
    suggestions: [],
    isLoading: false,
    error: null,
    lastUpdated: 0
  };

  private listeners: Set<(state: SocialState) => void> = new Set();
  private readonly STORAGE_KEY = 'soladia-social-state';
  private readonly FEED_URL = '/api/social/feed';
  private readonly USERS_URL = '/api/social/users';
  private readonly POSTS_URL = '/api/social/posts';
  private readonly NOTIFICATIONS_URL = '/api/social/notifications';

  constructor() {
    this.loadSocialStateFromStorage();
    this.initializeSocialFeatures();
  }

  /**
   * Initialize social features
   */
  private async initializeSocialFeatures(): Promise<void> {
    try {
      if (productionAuthService.isAuthenticated()) {
        await this.loadCurrentUser();
        await this.loadFeed();
        await this.loadNotifications();
        await this.loadFollowing();
        await this.loadFollowers();
        await this.loadSuggestions();
      }
    } catch (error) {
      console.error('Failed to initialize social features:', error);
    }
  }

  /**
   * Load current user profile
   */
  async loadCurrentUser(): Promise<SocialUser | null> {
    try {
      this.setState({ isLoading: true, error: null });

      const authUser = productionAuthService.getCurrentUser();
      if (!authUser) {
        throw this.createSocialError('NOT_AUTHENTICATED', 'User not authenticated');
      }

      const response = await fetch(`${this.USERS_URL}/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load user profile: ${response.statusText}`);
      }

      const data = await response.json();
      const socialUser: SocialUser = {
        id: data.user.id,
        username: data.user.username || authUser.name,
        displayName: data.user.displayName || authUser.name,
        bio: data.user.bio || '',
        avatar: data.user.avatar || authUser.avatar || '',
        banner: data.user.banner || '',
        verified: data.user.verified || false,
        followers: data.user.followers || 0,
        following: data.user.following || 0,
        nftsOwned: data.user.nftsOwned || 0,
        nftsCreated: data.user.nftsCreated || 0,
        totalValue: data.user.totalValue || 0,
        reputation: data.user.reputation || 0,
        badges: data.user.badges || [],
        socialLinks: data.user.socialLinks || {},
        createdAt: data.user.createdAt || Date.now(),
        lastActive: data.user.lastActive || Date.now()
      };

      this.setState({ currentUser: socialUser, isLoading: false });
      this.saveSocialStateToStorage();
      this.notifyListeners();

      return socialUser;

    } catch (error) {
      this.handleSocialError(error);
      return null;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: Partial<SocialUser>): Promise<boolean> {
    try {
      this.setState({ isLoading: true, error: null });

      const response = await fetch(`${this.USERS_URL}/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error(`Failed to update profile: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (this.state.currentUser) {
        const updatedUser = { ...this.state.currentUser, ...data.user };
        this.setState({ currentUser: updatedUser });
      }

      this.saveSocialStateToStorage();
      this.notifyListeners();

      return true;

    } catch (error) {
      this.handleSocialError(error);
      return false;
    } finally {
      this.setState({ isLoading: false });
    }
  }

  /**
   * Load social feed
   */
  async loadFeed(page: number = 1, limit: number = 20): Promise<SocialFeed | null> {
    try {
      this.setState({ isLoading: true, error: null });

      const response = await fetch(`${this.FEED_URL}?page=${page}&limit=${limit}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load feed: ${response.statusText}`);
      }

      const data = await response.json();
      const feed: SocialFeed = {
        posts: data.posts || [],
        pagination: {
          page: data.pagination?.page || page,
          limit: data.pagination?.limit || limit,
          total: data.pagination?.total || 0,
          hasMore: data.pagination?.hasMore || false
        },
        filters: data.filters || {}
      };

      this.setState({ feed, isLoading: false });
      this.saveSocialStateToStorage();
      this.notifyListeners();

      return feed;

    } catch (error) {
      this.handleSocialError(error);
      return null;
    }
  }

  /**
   * Create social post
   */
  async createPost(content: string, type: SocialPost['type'], nft?: any, images?: string[]): Promise<boolean> {
    try {
      this.setState({ isLoading: true, error: null });

      const response = await fetch(this.POSTS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({
          content,
          type,
          nft,
          images,
          visibility: 'public'
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to create post: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Add post to feed
      if (this.state.feed) {
        const updatedFeed = {
          ...this.state.feed,
          posts: [data.post, ...this.state.feed.posts]
        };
        this.setState({ feed: updatedFeed });
      }

      this.saveSocialStateToStorage();
      this.notifyListeners();

      return true;

    } catch (error) {
      this.handleSocialError(error);
      return false;
    } finally {
      this.setState({ isLoading: false });
    }
  }

  /**
   * Like/unlike post
   */
  async toggleLike(postId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.POSTS_URL}/${postId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to toggle like: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Update post in feed
      if (this.state.feed) {
        const updatedPosts = this.state.feed.posts.map(post =>
          post.id === postId
            ? { ...post, likes: data.likes, isLiked: data.isLiked }
            : post
        );
        
        const updatedFeed = {
          ...this.state.feed,
          posts: updatedPosts
        };
        
        this.setState({ feed: updatedFeed });
      }

      this.saveSocialStateToStorage();
      this.notifyListeners();

      return true;

    } catch (error) {
      this.handleSocialError(error);
      return false;
    }
  }

  /**
   * Comment on post
   */
  async addComment(postId: string, content: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.POSTS_URL}/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({ content })
      });

      if (!response.ok) {
        throw new Error(`Failed to add comment: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Update post in feed
      if (this.state.feed) {
        const updatedPosts = this.state.feed.posts.map(post =>
          post.id === postId
            ? { ...post, comments: post.comments + 1 }
            : post
        );
        
        const updatedFeed = {
          ...this.state.feed,
          posts: updatedPosts
        };
        
        this.setState({ feed: updatedFeed });
      }

      this.saveSocialStateToStorage();
      this.notifyListeners();

      return true;

    } catch (error) {
      this.handleSocialError(error);
      return false;
    }
  }

  /**
   * Follow user
   */
  async followUser(userId: string): Promise<boolean> {
    try {
      this.setState({ isLoading: true, error: null });

      const response = await fetch(`${this.USERS_URL}/${userId}/follow`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to follow user: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Update following list
      const updatedFollowing = [...this.state.following, data.user];
      this.setState({ following: updatedFollowing });

      // Update current user's following count
      if (this.state.currentUser) {
        const updatedUser = {
          ...this.state.currentUser,
          following: this.state.currentUser.following + 1
        };
        this.setState({ currentUser: updatedUser });
      }

      this.saveSocialStateToStorage();
      this.notifyListeners();
      
      return true;

    } catch (error) {
      this.handleSocialError(error);
      return false;
    } finally {
      this.setState({ isLoading: false });
    }
  }

  /**
   * Unfollow user
   */
  async unfollowUser(userId: string): Promise<boolean> {
    try {
      this.setState({ isLoading: true, error: null });

      const response = await fetch(`${this.USERS_URL}/${userId}/unfollow`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to unfollow user: ${response.statusText}`);
      }

      // Update following list
      const updatedFollowing = this.state.following.filter(user => user.id !== userId);
      this.setState({ following: updatedFollowing });

      // Update current user's following count
      if (this.state.currentUser) {
        const updatedUser = {
          ...this.state.currentUser,
          following: Math.max(0, this.state.currentUser.following - 1)
        };
        this.setState({ currentUser: updatedUser });
      }

      this.saveSocialStateToStorage();
      this.notifyListeners();
      
      return true;

    } catch (error) {
      this.handleSocialError(error);
      return false;
    } finally {
      this.setState({ isLoading: false });
    }
  }

  /**
   * Load following list
   */
  async loadFollowing(): Promise<SocialUser[]> {
    try {
      const response = await fetch(`${this.USERS_URL}/following`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load following: ${response.statusText}`);
      }

      const data = await response.json();
      const following = data.users || [];

      this.setState({ following });
      this.saveSocialStateToStorage();

      return following;

    } catch (error) {
      this.handleSocialError(error);
      return [];
    }
  }

  /**
   * Load followers list
   */
  async loadFollowers(): Promise<SocialUser[]> {
    try {
      const response = await fetch(`${this.USERS_URL}/followers`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load followers: ${response.statusText}`);
      }

      const data = await response.json();
      const followers = data.users || [];

      this.setState({ followers });
      this.saveSocialStateToStorage();

      return followers;

    } catch (error) {
      this.handleSocialError(error);
      return [];
    }
  }

  /**
   * Load user suggestions
   */
  async loadSuggestions(): Promise<SocialUser[]> {
    try {
      const response = await fetch(`${this.USERS_URL}/suggestions`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load suggestions: ${response.statusText}`);
      }

      const data = await response.json();
      const suggestions = data.users || [];

      this.setState({ suggestions });
      this.saveSocialStateToStorage();

      return suggestions;

    } catch (error) {
      this.handleSocialError(error);
      return [];
    }
  }

  /**
   * Load notifications
   */
  async loadNotifications(): Promise<SocialNotification[]> {
    try {
      const response = await fetch(this.NOTIFICATIONS_URL, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load notifications: ${response.statusText}`);
      }

      const data = await response.json();
      const notifications = data.notifications || [];

      this.setState({ notifications });
      this.saveSocialStateToStorage();

      return notifications;

    } catch (error) {
      this.handleSocialError(error);
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(notificationId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.NOTIFICATIONS_URL}/${notificationId}/read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to mark notification as read: ${response.statusText}`);
      }

      // Update notification in state
      const updatedNotifications = this.state.notifications.map(notification =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      );

      this.setState({ notifications: updatedNotifications });
      this.saveSocialStateToStorage();
      this.notifyListeners();
      
      return true;

    } catch (error) {
      this.handleSocialError(error);
      return false;
    }
  }

  /**
   * Search users
   */
  async searchUsers(query: string): Promise<SocialUser[]> {
    try {
      const response = await fetch(`${this.USERS_URL}/search?q=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to search users: ${response.statusText}`);
      }

      const data = await response.json();
      return data.users || [];

    } catch (error) {
      this.handleSocialError(error);
      return [];
    }
  }

  /**
   * Get user profile by ID
   */
  async getUserProfile(userId: string): Promise<SocialUser | null> {
    try {
      const response = await fetch(`${this.USERS_URL}/${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get user profile: ${response.statusText}`);
      }

      const data = await response.json();
      return data.user || null;

    } catch (error) {
      this.handleSocialError(error);
      return null;
    }
  }

  /**
   * Get auth token
   */
  private getAuthToken(): string {
    return localStorage.getItem('soladia-auth-token') || '';
  }

  /**
   * Get current social state
   */
  getState(): SocialState {
    return { ...this.state };
  }

  /**
   * Add state change listener
   */
  addStateListener(listener: (state: SocialState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Get current user
   */
  getCurrentUser(): SocialUser | null {
    return this.state.currentUser;
  }

  /**
   * Get social feed
   */
  getFeed(): SocialFeed | null {
    return this.state.feed;
  }

  /**
   * Get notifications
   */
  getNotifications(): SocialNotification[] {
    return [...this.state.notifications];
  }

  /**
   * Get unread notification count
   */
  getUnreadNotificationCount(): number {
    return this.state.notifications.filter(notification => !notification.read).length;
  }

  /**
   * Get following list
   */
  getFollowing(): SocialUser[] {
    return [...this.state.following];
  }

  /**
   * Get followers list
   */
  getFollowers(): SocialUser[] {
    return [...this.state.followers];
  }

  /**
   * Get suggestions
   */
  getSuggestions(): SocialUser[] {
    return [...this.state.suggestions];
  }

  /**
   * Handle social errors
   */
  private handleSocialError(error: any): void {
    const socialError = this.createSocialError(
      error.code || 'UNKNOWN_ERROR',
      error.message || 'An unknown error occurred',
      error.details
    );

    this.setState({
      isLoading: false,
      error: socialError.message,
      lastUpdated: Date.now()
    });

    console.error('Social error:', socialError);
  }

  /**
   * Create social error
   */
  private createSocialError(code: string, message: string, details?: any): SocialError {
    return {
      code,
      message,
      details,
      retryable: false,
      timestamp: Date.now()
    };
  }

  /**
   * Set social state
   */
  private setState(updates: Partial<SocialState>): void {
    this.state = { ...this.state, ...updates };
  }

  /**
   * Notify listeners of state changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.state);
    } catch (error) {
        console.error('Error in social state listener:', error);
      }
    });
  }

  /**
   * Save social state to storage
   */
  private saveSocialStateToStorage(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
    } catch (error) {
      console.warn('Failed to save social state to storage:', error);
    }
  }

  /**
   * Load social state from storage
   */
  private loadSocialStateFromStorage(): void {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const state = JSON.parse(saved);
        this.setState(state);
      }
    } catch (error) {
      console.warn('Failed to load social state from storage:', error);
    }
  }

  /**
   * Clear social data
   */
  clearSocialData(): void {
    this.setState({
      currentUser: null,
      feed: null,
      notifications: [],
      following: [],
      followers: [],
      suggestions: [],
      error: null
    });
    this.saveSocialStateToStorage();
  }
}

// Export singleton instance
export const socialFeaturesService = new SocialFeaturesService();
export default socialFeaturesService;