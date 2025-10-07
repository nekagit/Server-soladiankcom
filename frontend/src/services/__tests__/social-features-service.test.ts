/**
 * Social Features Service Tests
 * Comprehensive test suite for the social features functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SocialFeaturesService, User, Post, Comment, Notification, TrendingItem } from '../social-features-service.ts';

// Mock fetch
global.fetch = vi.fn();

describe('SocialFeaturesService', () => {
  let socialService: SocialFeaturesService;
  let mockFetch: any;

  beforeEach(() => {
    socialService = new SocialFeaturesService('/api/social', 'test-api-key');
    mockFetch = vi.mocked(fetch);
    
    // Clear localStorage
    localStorage.clear();
    
    // Reset fetch mock
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getCurrentUser', () => {
    it('should get current user from API', async () => {
      const mockUser: User = {
        id: '1',
        name: 'Test User',
        username: 'testuser',
        bio: 'Test bio',
        avatar: '/avatar.jpg',
        banner: '/banner.jpg',
        verified: false,
        following: 10,
        followers: 20,
        nfts: 5,
        collections: 2,
        joinedAt: '2023-01-01T00:00:00Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user: mockUser })
      });

      const result = await socialService.getCurrentUser();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/social/user/me'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key'
          })
        })
      );

      expect(result).toEqual(mockUser);
    });

    it('should return null on API error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await socialService.getCurrentUser();

      expect(result).toBeNull();
    });
  });

  describe('getUserProfile', () => {
    it('should get user profile by ID', async () => {
      const mockUser: User = {
        id: '2',
        name: 'Another User',
        username: 'anotheruser',
        bio: 'Another bio',
        avatar: '/avatar2.jpg',
        banner: '/banner2.jpg',
        verified: true,
        following: 50,
        followers: 100,
        nfts: 25,
        collections: 5,
        joinedAt: '2023-02-01T00:00:00Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user: mockUser })
      });

      const result = await socialService.getUserProfile('2');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/social/user/2'),
        expect.objectContaining({
          method: 'GET'
        })
      );

      expect(result).toEqual(mockUser);
    });

    it('should return null on API error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await socialService.getUserProfile('2');

      expect(result).toBeNull();
    });
  });

  describe('updateUserProfile', () => {
    it('should update user profile', async () => {
      const updates = {
        name: 'Updated Name',
        bio: 'Updated bio'
      };

      const updatedUser: User = {
        id: '1',
        name: 'Updated Name',
        username: 'testuser',
        bio: 'Updated bio',
        avatar: '/avatar.jpg',
        banner: '/banner.jpg',
        verified: false,
        following: 10,
        followers: 20,
        nfts: 5,
        collections: 2,
        joinedAt: '2023-01-01T00:00:00Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user: updatedUser })
      });

      const result = await socialService.updateUserProfile(updates);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/social/user/me'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updates)
        })
      );

      expect(result).toEqual(updatedUser);
    });

    it('should return null on API error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await socialService.updateUserProfile({ name: 'New Name' });

      expect(result).toBeNull();
    });
  });

  describe('getSocialFeed', () => {
    it('should get social feed', async () => {
      const mockPosts: Post[] = [
        {
          id: '1',
          userId: '1',
          user: {
            id: '1',
            name: 'Test User',
            username: 'testuser',
            bio: 'Test bio',
            avatar: '/avatar.jpg',
            banner: '/banner.jpg',
            verified: false,
            following: 10,
            followers: 20,
            nfts: 5,
            collections: 2,
            joinedAt: '2023-01-01T00:00:00Z'
          },
          content: 'Test post content',
          timestamp: '2023-01-01T00:00:00Z',
          likes: 10,
          retweets: 5,
          comments: 3,
          liked: false,
          retweeted: false,
          bookmarked: false
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ posts: mockPosts })
      });

      const result = await socialService.getSocialFeed(1, 20);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/social/feed'),
        expect.objectContaining({
          method: 'GET'
        })
      );

      expect(result).toEqual(mockPosts);
    });

    it('should return empty array on API error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await socialService.getSocialFeed();

      expect(result).toEqual([]);
    });
  });

  describe('createPost', () => {
    it('should create a new post', async () => {
      const content = 'Test post content';
      const media = {
        type: 'image' as const,
        url: '/image.jpg'
      };
      const tags = ['test', 'nft'];

      const mockPost: Post = {
        id: '1',
        userId: '1',
        user: {
          id: '1',
          name: 'Test User',
          username: 'testuser',
          bio: 'Test bio',
          avatar: '/avatar.jpg',
          banner: '/banner.jpg',
          verified: false,
          following: 10,
          followers: 20,
          nfts: 5,
          collections: 2,
          joinedAt: '2023-01-01T00:00:00Z'
        },
        content,
        media,
        tags,
        timestamp: '2023-01-01T00:00:00Z',
        likes: 0,
        retweets: 0,
        comments: 0,
        liked: false,
        retweeted: false,
        bookmarked: false
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ post: mockPost })
      });

      const result = await socialService.createPost(content, media, tags);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/social/posts'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            content,
            media,
            tags,
            user_id: undefined
          })
        })
      );

      expect(result).toEqual(mockPost);
    });

    it('should return null on API error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await socialService.createPost('Test content');

      expect(result).toBeNull();
    });
  });

  describe('likePost', () => {
    it('should like a post', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      });

      const result = await socialService.likePost('1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/social/posts/1/like'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            user_id: undefined
          })
        })
      );

      expect(result).toBe(true);
    });

    it('should return false on API error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await socialService.likePost('1');

      expect(result).toBe(false);
    });
  });

  describe('unlikePost', () => {
    it('should unlike a post', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      });

      const result = await socialService.unlikePost('1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/social/posts/1/like'),
        expect.objectContaining({
          method: 'DELETE',
          body: JSON.stringify({
            user_id: undefined
          })
        })
      );

      expect(result).toBe(true);
    });

    it('should return false on API error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await socialService.unlikePost('1');

      expect(result).toBe(false);
    });
  });

  describe('retweetPost', () => {
    it('should retweet a post', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      });

      const result = await socialService.retweetPost('1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/social/posts/1/retweet'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            user_id: undefined
          })
        })
      );

      expect(result).toBe(true);
    });

    it('should return false on API error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await socialService.retweetPost('1');

      expect(result).toBe(false);
    });
  });

  describe('unretweetPost', () => {
    it('should unretweet a post', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      });

      const result = await socialService.unretweetPost('1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/social/posts/1/retweet'),
        expect.objectContaining({
          method: 'DELETE',
          body: JSON.stringify({
            user_id: undefined
          })
        })
      );

      expect(result).toBe(true);
    });

    it('should return false on API error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await socialService.unretweetPost('1');

      expect(result).toBe(false);
    });
  });

  describe('bookmarkPost', () => {
    it('should bookmark a post', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      });

      const result = await socialService.bookmarkPost('1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/social/posts/1/bookmark'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            user_id: undefined
          })
        })
      );

      expect(result).toBe(true);
    });

    it('should return false on API error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await socialService.bookmarkPost('1');

      expect(result).toBe(false);
    });
  });

  describe('unbookmarkPost', () => {
    it('should unbookmark a post', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      });

      const result = await socialService.unbookmarkPost('1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/social/posts/1/bookmark'),
        expect.objectContaining({
          method: 'DELETE',
          body: JSON.stringify({
            user_id: undefined
          })
        })
      );

      expect(result).toBe(true);
    });

    it('should return false on API error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await socialService.unbookmarkPost('1');

      expect(result).toBe(false);
    });
  });

  describe('getPostComments', () => {
    it('should get post comments', async () => {
      const mockComments: Comment[] = [
        {
          id: '1',
          postId: '1',
          userId: '2',
          user: {
            id: '2',
            name: 'Commenter',
            username: 'commenter',
            bio: 'Commenter bio',
            avatar: '/avatar2.jpg',
            banner: '/banner2.jpg',
            verified: false,
            following: 5,
            followers: 10,
            nfts: 2,
            collections: 1,
            joinedAt: '2023-01-01T00:00:00Z'
          },
          content: 'Test comment',
          timestamp: '2023-01-01T00:00:00Z',
          likes: 2,
          liked: false
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ comments: mockComments })
      });

      const result = await socialService.getPostComments('1', 1, 20);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/social/posts/1/comments'),
        expect.objectContaining({
          method: 'GET'
        })
      );

      expect(result).toEqual(mockComments);
    });

    it('should return empty array on API error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await socialService.getPostComments('1');

      expect(result).toEqual([]);
    });
  });

  describe('addComment', () => {
    it('should add comment to post', async () => {
      const content = 'Test comment';
      const mockComment: Comment = {
        id: '1',
        postId: '1',
        userId: '1',
        user: {
          id: '1',
          name: 'Test User',
          username: 'testuser',
          bio: 'Test bio',
          avatar: '/avatar.jpg',
          banner: '/banner.jpg',
          verified: false,
          following: 10,
          followers: 20,
          nfts: 5,
          collections: 2,
          joinedAt: '2023-01-01T00:00:00Z'
        },
        content,
        timestamp: '2023-01-01T00:00:00Z',
        likes: 0,
        liked: false
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ comment: mockComment })
      });

      const result = await socialService.addComment('1', content);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/social/posts/1/comments'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            content,
            user_id: undefined
          })
        })
      );

      expect(result).toEqual(mockComment);
    });

    it('should return null on API error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await socialService.addComment('1', 'Test comment');

      expect(result).toBeNull();
    });
  });

  describe('followUser', () => {
    it('should follow a user', async () => {
      const mockUser: User = {
        id: '2',
        name: 'Another User',
        username: 'anotheruser',
        bio: 'Another bio',
        avatar: '/avatar2.jpg',
        banner: '/banner2.jpg',
        verified: false,
        following: 5,
        followers: 10,
        nfts: 2,
        collections: 1,
        joinedAt: '2023-01-01T00:00:00Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      });

      // Mock getUserProfile to return the user
      vi.spyOn(socialService, 'getUserProfile').mockResolvedValueOnce(mockUser);

      const result = await socialService.followUser('2');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/social/follow'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            follower_id: undefined,
            following_id: '2'
          })
        })
      );

      expect(result).toBe(true);
    });

    it('should return false on API error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await socialService.followUser('2');

      expect(result).toBe(false);
    });
  });

  describe('unfollowUser', () => {
    it('should unfollow a user', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      });

      const result = await socialService.unfollowUser('2');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/social/follow'),
        expect.objectContaining({
          method: 'DELETE',
          body: JSON.stringify({
            follower_id: undefined,
            following_id: '2'
          })
        })
      );

      expect(result).toBe(true);
    });

    it('should return false on API error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await socialService.unfollowUser('2');

      expect(result).toBe(false);
    });
  });

  describe('getFollowing', () => {
    it('should get following list', async () => {
      const mockUsers: User[] = [
        {
          id: '2',
          name: 'Following User',
          username: 'followinguser',
          bio: 'Following bio',
          avatar: '/avatar2.jpg',
          banner: '/banner2.jpg',
          verified: false,
          following: 5,
          followers: 10,
          nfts: 2,
          collections: 1,
          joinedAt: '2023-01-01T00:00:00Z'
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ users: mockUsers })
      });

      const result = await socialService.getFollowing('1', 1, 20);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/social/user/1/following'),
        expect.objectContaining({
          method: 'GET'
        })
      );

      expect(result).toEqual(mockUsers);
    });

    it('should return empty array on API error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await socialService.getFollowing('1');

      expect(result).toEqual([]);
    });
  });

  describe('getFollowers', () => {
    it('should get followers list', async () => {
      const mockUsers: User[] = [
        {
          id: '3',
          name: 'Follower User',
          username: 'followeruser',
          bio: 'Follower bio',
          avatar: '/avatar3.jpg',
          banner: '/banner3.jpg',
          verified: false,
          following: 3,
          followers: 5,
          nfts: 1,
          collections: 0,
          joinedAt: '2023-01-01T00:00:00Z'
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ users: mockUsers })
      });

      const result = await socialService.getFollowers('1', 1, 20);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/social/user/1/followers'),
        expect.objectContaining({
          method: 'GET'
        })
      );

      expect(result).toEqual(mockUsers);
    });

    it('should return empty array on API error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await socialService.getFollowers('1');

      expect(result).toEqual([]);
    });
  });

  describe('isFollowing', () => {
    it('should check if user is following another user', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ isFollowing: true })
      });

      const result = await socialService.isFollowing('1', '2');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/social/follow/check'),
        expect.objectContaining({
          method: 'GET'
        })
      );

      expect(result).toBe(true);
    });

    it('should return false on API error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await socialService.isFollowing('1', '2');

      expect(result).toBe(false);
    });
  });

  describe('getTrendingItems', () => {
    it('should get trending items', async () => {
      const mockTrending: TrendingItem[] = [
        {
          id: '1',
          type: 'nft',
          title: 'Trending NFT',
          description: 'A trending NFT',
          image: '/nft.jpg',
          price: '10 SOL',
          change: '+20%'
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: mockTrending })
      });

      const result = await socialService.getTrendingItems(20);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/social/trending'),
        expect.objectContaining({
          method: 'GET'
        })
      );

      expect(result).toEqual(mockTrending);
    });

    it('should return empty array on API error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await socialService.getTrendingItems();

      expect(result).toEqual([]);
    });
  });

  describe('getPopularCreators', () => {
    it('should get popular creators', async () => {
      const mockCreators: User[] = [
        {
          id: '1',
          name: 'Popular Creator',
          username: 'popularcreator',
          bio: 'Popular creator bio',
          avatar: '/avatar.jpg',
          banner: '/banner.jpg',
          verified: true,
          following: 100,
          followers: 1000,
          nfts: 50,
          collections: 10,
          joinedAt: '2023-01-01T00:00:00Z'
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ creators: mockCreators })
      });

      const result = await socialService.getPopularCreators(20);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/social/creators/popular'),
        expect.objectContaining({
          method: 'GET'
        })
      );

      expect(result).toEqual(mockCreators);
    });

    it('should return empty array on API error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await socialService.getPopularCreators();

      expect(result).toEqual([]);
    });
  });

  describe('getFeaturedCollections', () => {
    it('should get featured collections', async () => {
      const mockCollections = [
        {
          id: '1',
          name: 'Featured Collection',
          description: 'A featured collection',
          image: '/collection.jpg',
          floorPrice: '5 SOL',
          volume: '100 SOL'
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ collections: mockCollections })
      });

      const result = await socialService.getFeaturedCollections(20);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/social/collections/featured'),
        expect.objectContaining({
          method: 'GET'
        })
      );

      expect(result).toEqual(mockCollections);
    });

    it('should return empty array on API error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await socialService.getFeaturedCollections();

      expect(result).toEqual([]);
    });
  });

  describe('searchUsers', () => {
    it('should search users', async () => {
      const mockUsers: User[] = [
        {
          id: '1',
          name: 'Search Result',
          username: 'searchresult',
          bio: 'Search result bio',
          avatar: '/avatar.jpg',
          banner: '/banner.jpg',
          verified: false,
          following: 5,
          followers: 10,
          nfts: 2,
          collections: 1,
          joinedAt: '2023-01-01T00:00:00Z'
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ users: mockUsers })
      });

      const result = await socialService.searchUsers('test', 20);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/social/users/search'),
        expect.objectContaining({
          method: 'GET'
        })
      );

      expect(result).toEqual(mockUsers);
    });

    it('should return empty array on API error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await socialService.searchUsers('test');

      expect(result).toEqual([]);
    });
  });

  describe('getNotifications', () => {
    it('should get notifications', async () => {
      const mockNotifications: Notification[] = [
        {
          id: '1',
          userId: '1',
          type: 'like',
          fromUserId: '2',
          fromUser: {
            id: '2',
            name: 'Liker',
            username: 'liker',
            bio: 'Liker bio',
            avatar: '/avatar2.jpg',
            banner: '/banner2.jpg',
            verified: false,
            following: 5,
            followers: 10,
            nfts: 2,
            collections: 1,
            joinedAt: '2023-01-01T00:00:00Z'
          },
          postId: '1',
          message: 'liked your post',
          read: false,
          timestamp: '2023-01-01T00:00:00Z'
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ notifications: mockNotifications })
      });

      const result = await socialService.getNotifications(1, 20);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/social/notifications'),
        expect.objectContaining({
          method: 'GET'
        })
      );

      expect(result).toEqual(mockNotifications);
    });

    it('should return empty array on API error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await socialService.getNotifications();

      expect(result).toEqual([]);
    });
  });

  describe('markNotificationAsRead', () => {
    it('should mark notification as read', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      });

      const result = await socialService.markNotificationAsRead('1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/social/notifications/1/read'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({
            user_id: undefined
          })
        })
      );

      expect(result).toBe(true);
    });

    it('should return false on API error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await socialService.markNotificationAsRead('1');

      expect(result).toBe(false);
    });
  });

  describe('markAllNotificationsAsRead', () => {
    it('should mark all notifications as read', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      });

      const result = await socialService.markAllNotificationsAsRead();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/social/notifications/read-all'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({
            user_id: undefined
          })
        })
      );

      expect(result).toBe(true);
    });

    it('should return false on API error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await socialService.markAllNotificationsAsRead();

      expect(result).toBe(false);
    });
  });

  describe('getUnreadNotificationCount', () => {
    it('should return unread notification count', () => {
      const notifications: Notification[] = [
        {
          id: '1',
          userId: '1',
          type: 'like',
          message: 'liked your post',
          read: false,
          timestamp: '2023-01-01T00:00:00Z'
        },
        {
          id: '2',
          userId: '1',
          type: 'follow',
          message: 'started following you',
          read: true,
          timestamp: '2023-01-01T00:00:00Z'
        }
      ];

      socialService['notifications'] = notifications;

      const result = socialService.getUnreadNotificationCount();

      expect(result).toBe(1);
    });
  });

  describe('getSocialStats', () => {
    it('should get social stats', async () => {
      const mockStats = {
        totalUsers: 1000,
        totalPosts: 5000,
        totalNFTs: 10000,
        totalCollections: 500,
        activeUsers: 100,
        engagementRate: 0.75
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ stats: mockStats })
      });

      const result = await socialService.getSocialStats();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/social/stats'),
        expect.objectContaining({
          method: 'GET'
        })
      );

      expect(result).toEqual(mockStats);
    });

    it('should return default stats on API error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await socialService.getSocialStats();

      expect(result).toEqual({
        totalUsers: 0,
        totalPosts: 0,
        totalNFTs: 0,
        totalCollections: 0,
        activeUsers: 0,
        engagementRate: 0
      });
    });
  });

  describe('localStorage integration', () => {
    it('should save and load user data from localStorage', () => {
      const user: User = {
        id: '1',
        name: 'Test User',
        username: 'testuser',
        bio: 'Test bio',
        avatar: '/avatar.jpg',
        banner: '/banner.jpg',
        verified: false,
        following: 10,
        followers: 20,
        nfts: 5,
        collections: 2,
        joinedAt: '2023-01-01T00:00:00Z'
      };

      const notifications: Notification[] = [
        {
          id: '1',
          userId: '1',
          type: 'like',
          message: 'liked your post',
          read: false,
          timestamp: '2023-01-01T00:00:00Z'
        }
      ];

      const following: User[] = [user];
      const followers: User[] = [user];

      // Save data
      socialService['currentUser'] = user;
      socialService['notifications'] = notifications;
      socialService['following'] = following;
      socialService['followers'] = followers;
      socialService['saveUserData']();

      // Create new service instance
      const newService = new SocialFeaturesService();
      
      // Check that data is loaded
      expect(newService['currentUser']).toEqual(user);
      expect(newService['notifications']).toEqual(notifications);
      expect(newService['following']).toEqual(following);
      expect(newService['followers']).toEqual(followers);
    });
  });

  describe('clearUserData', () => {
    it('should clear all user data', () => {
      socialService['currentUser'] = {
        id: '1',
        name: 'Test User',
        username: 'testuser',
        bio: 'Test bio',
        avatar: '/avatar.jpg',
        banner: '/banner.jpg',
        verified: false,
        following: 10,
        followers: 20,
        nfts: 5,
        collections: 2,
        joinedAt: '2023-01-01T00:00:00Z'
      };
      socialService['notifications'] = [];
      socialService['following'] = [];
      socialService['followers'] = [];

      socialService.clearUserData();

      expect(socialService['currentUser']).toBeNull();
      expect(socialService['notifications']).toEqual([]);
      expect(socialService['following']).toEqual([]);
      expect(socialService['followers']).toEqual([]);
    });
  });

  describe('exportUserData', () => {
    it('should export user data', () => {
      const user: User = {
        id: '1',
        name: 'Test User',
        username: 'testuser',
        bio: 'Test bio',
        avatar: '/avatar.jpg',
        banner: '/banner.jpg',
        verified: false,
        following: 10,
        followers: 20,
        nfts: 5,
        collections: 2,
        joinedAt: '2023-01-01T00:00:00Z'
      };

      const notifications: Notification[] = [];
      const following: User[] = [];
      const followers: User[] = [];

      socialService['currentUser'] = user;
      socialService['notifications'] = notifications;
      socialService['following'] = following;
      socialService['followers'] = followers;

      const result = socialService.exportUserData();

      expect(result).toEqual({
        user,
        notifications,
        following,
        followers
      });
    });
  });

  describe('importUserData', () => {
    it('should import user data', () => {
      const user: User = {
        id: '1',
        name: 'Test User',
        username: 'testuser',
        bio: 'Test bio',
        avatar: '/avatar.jpg',
        banner: '/banner.jpg',
        verified: false,
        following: 10,
        followers: 20,
        nfts: 5,
        collections: 2,
        joinedAt: '2023-01-01T00:00:00Z'
      };

      const data = {
        user,
        notifications: [],
        following: [],
        followers: []
      };

      socialService.importUserData(data);

      expect(socialService['currentUser']).toEqual(user);
      expect(socialService['notifications']).toEqual([]);
      expect(socialService['following']).toEqual([]);
      expect(socialService['followers']).toEqual([]);
    });
  });
});
