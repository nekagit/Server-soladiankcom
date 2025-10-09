// frontend/src/services/social.ts
interface User {
    id: string;
    username: string;
    fullName: string;
    avatar: string;
    bio: string;
    location: string;
    website: string;
    socialLinks: {
        twitter?: string;
        instagram?: string;
        discord?: string;
    };
    stats: {
        followers: number;
        following: number;
        listings: number;
        sales: number;
        rating: number;
        reviewCount: number;
    };
    badges: string[];
    isVerified: boolean;
    joinedAt: string;
}

interface Post {
    id: string;
    author: User;
    content: string;
    images: string[];
    tags: string[];
    likes: number;
    comments: number;
    shares: number;
    createdAt: string;
    updatedAt: string;
    isLiked: boolean;
    isBookmarked: boolean;
}

interface Comment {
    id: string;
    author: User;
    content: string;
    likes: number;
    createdAt: string;
    isLiked: boolean;
    replies: Comment[];
}

interface Follow {
    id: string;
    follower: User;
    following: User;
    createdAt: string;
}

interface SocialFeed {
    posts: Post[];
    hasMore: boolean;
    nextCursor?: string;
}

class SocialService {
    private currentUser: User | null = null;
    private feedCache: Map<string, SocialFeed> = new Map();
    private userCache: Map<string, User> = new Map();
    private isInitialized = false;

    constructor() {
        if (typeof window !== 'undefined') {
            this.initializeSocial();
        }
    }

    private async initializeSocial() {
        try {
            // Load current user data
            await this.loadCurrentUser();
            this.isInitialized = true;
            console.log('Social Service initialized');
        } catch (error) {
            console.error('Failed to initialize Social Service:', error);
        }
    }

    private async loadCurrentUser() {
        try {
            const authManager = (window as any).authManager;
            if (authManager && authManager.isAuthenticated()) {
                const user = authManager.getCurrentUser();
                if (user) {
                    this.currentUser = await this.getUserProfile(user.id);
                }
            }
        } catch (error) {
            console.error('Failed to load current user:', error);
        }
    }

    public async getUserProfile(userId: string): Promise<User> {
        // Check cache first
        if (this.userCache.has(userId)) {
            return this.userCache.get(userId)!;
        }

        try {
            // Mock user data - in production, this would fetch from API
            const user: User = {
                id: userId,
                username: `user${userId}`,
                fullName: 'John Doe',
                avatar: 'https://via.placeholder.com/150x150',
                bio: 'Digital artist and NFT creator',
                location: 'San Francisco, CA',
                website: 'https://example.com',
                socialLinks: {
                    twitter: '@johndoe',
                    instagram: '@johndoe_art',
                    discord: 'johndoe#1234',
                },
                stats: {
                    followers: 1250,
                    following: 340,
                    listings: 45,
                    sales: 23,
                    rating: 4.8,
                    reviewCount: 156,
                },
                badges: ['verified', 'top_seller', 'early_adopter'],
                isVerified: true,
                joinedAt: '2023-01-15T00:00:00Z',
            };

            this.userCache.set(userId, user);
            return user;
        } catch (error) {
            console.error('Failed to get user profile:', error);
            throw error;
        }
    }

    public async getSocialFeed(cursor?: string): Promise<SocialFeed> {
        if (!this.isInitialized) {
            await this.initializeSocial();
        }

        const cacheKey = cursor || 'initial';
        if (this.feedCache.has(cacheKey)) {
            return this.feedCache.get(cacheKey)!;
        }

        try {
            // Mock feed data - in production, this would fetch from API
            const posts: Post[] = [
                {
                    id: '1',
                    author: await this.getUserProfile('1'),
                    content: 'Just listed my latest NFT collection! Check it out 🎨✨',
                    images: ['https://via.placeholder.com/400x300'],
                    tags: ['nft', 'art', 'digital'],
                    likes: 45,
                    comments: 12,
                    shares: 8,
                    createdAt: '2024-01-15T10:30:00Z',
                    updatedAt: '2024-01-15T10:30:00Z',
                    isLiked: false,
                    isBookmarked: false,
                },
                {
                    id: '2',
                    author: await this.getUserProfile('2'),
                    content: 'Amazing vintage camera find today! Perfect condition 📸',
                    images: ['https://via.placeholder.com/400x300', 'https://via.placeholder.com/400x300'],
                    tags: ['camera', 'vintage', 'photography'],
                    likes: 32,
                    comments: 7,
                    shares: 3,
                    createdAt: '2024-01-15T09:15:00Z',
                    updatedAt: '2024-01-15T09:15:00Z',
                    isLiked: true,
                    isBookmarked: true,
                },
                {
                    id: '3',
                    author: await this.getUserProfile('3'),
                    content: 'Looking for recommendations on the best photography equipment. What do you use?',
                    images: [],
                    tags: ['photography', 'equipment', 'recommendations'],
                    likes: 18,
                    comments: 25,
                    shares: 5,
                    createdAt: '2024-01-15T08:45:00Z',
                    updatedAt: '2024-01-15T08:45:00Z',
                    isLiked: false,
                    isBookmarked: false,
                },
            ];

            const feed: SocialFeed = {
                posts,
                hasMore: true,
                nextCursor: 'next_page_cursor',
            };

            this.feedCache.set(cacheKey, feed);
            return feed;
        } catch (error) {
            console.error('Failed to get social feed:', error);
            throw error;
        }
    }

    public async createPost(content: string, images: string[] = [], tags: string[] = []): Promise<Post> {
        if (!this.currentUser) {
            throw new Error('User not authenticated');
        }

        try {
            const post: Post = {
                id: `post_${Date.now()}`,
                author: this.currentUser,
                content,
                images,
                tags,
                likes: 0,
                comments: 0,
                shares: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                isLiked: false,
                isBookmarked: false,
            };

            // In production, this would save to the backend
            console.log('Post created:', post);
            return post;
        } catch (error) {
            console.error('Failed to create post:', error);
            throw error;
        }
    }

    public async likePost(postId: string): Promise<boolean> {
        try {
            // In production, this would call the API
            console.log('Liked post:', postId);
            return true;
        } catch (error) {
            console.error('Failed to like post:', error);
            return false;
        }
    }

    public async unlikePost(postId: string): Promise<boolean> {
        try {
            // In production, this would call the API
            console.log('Unliked post:', postId);
            return true;
        } catch (error) {
            console.error('Failed to unlike post:', error);
            return false;
        }
    }

    public async bookmarkPost(postId: string): Promise<boolean> {
        try {
            // In production, this would call the API
            console.log('Bookmarked post:', postId);
            return true;
        } catch (error) {
            console.error('Failed to bookmark post:', error);
            return false;
        }
    }

    public async unbookmarkPost(postId: string): Promise<boolean> {
        try {
            // In production, this would call the API
            console.log('Unbookmarked post:', postId);
            return true;
        } catch (error) {
            console.error('Failed to unbookmark post:', error);
            return false;
        }
    }

    public async getPostComments(postId: string): Promise<Comment[]> {
        try {
            // Mock comments - in production, this would fetch from API
            const comments: Comment[] = [
                {
                    id: '1',
                    author: await this.getUserProfile('4'),
                    content: 'Amazing work! Love the colors 🎨',
                    likes: 5,
                    createdAt: '2024-01-15T11:00:00Z',
                    isLiked: false,
                    replies: [],
                },
                {
                    id: '2',
                    author: await this.getUserProfile('5'),
                    content: 'Where can I buy this?',
                    likes: 2,
                    createdAt: '2024-01-15T11:30:00Z',
                    isLiked: true,
                    replies: [
                        {
                            id: '2-1',
                            author: await this.getUserProfile('1'),
                            content: 'Check my profile for the listing!',
                            likes: 1,
                            createdAt: '2024-01-15T11:35:00Z',
                            isLiked: false,
                            replies: [],
                        },
                    ],
                },
            ];

            return comments;
        } catch (error) {
            console.error('Failed to get post comments:', error);
            return [];
        }
    }

    public async addComment(postId: string, content: string, parentId?: string): Promise<Comment> {
        if (!this.currentUser) {
            throw new Error('User not authenticated');
        }

        try {
            const comment: Comment = {
                id: `comment_${Date.now()}`,
                author: this.currentUser,
                content,
                likes: 0,
                createdAt: new Date().toISOString(),
                isLiked: false,
                replies: [],
            };

            // In production, this would save to the backend
            console.log('Comment added:', comment);
            return comment;
        } catch (error) {
            console.error('Failed to add comment:', error);
            throw error;
        }
    }

    public async followUser(userId: string): Promise<boolean> {
        try {
            // In production, this would call the API
            console.log('Followed user:', userId);
            return true;
        } catch (error) {
            console.error('Failed to follow user:', error);
            return false;
        }
    }

    public async unfollowUser(userId: string): Promise<boolean> {
        try {
            // In production, this would call the API
            console.log('Unfollowed user:', userId);
            return true;
        } catch (error) {
            console.error('Failed to unfollow user:', error);
            return false;
        }
    }

    public async getFollowers(userId: string): Promise<User[]> {
        try {
            // Mock followers - in production, this would fetch from API
            const followers: User[] = [];
            for (let i = 1; i <= 10; i++) {
                followers.push(await this.getUserProfile(i.toString()));
            }
            return followers;
        } catch (error) {
            console.error('Failed to get followers:', error);
            return [];
        }
    }

    public async getFollowing(userId: string): Promise<User[]> {
        try {
            // Mock following - in production, this would fetch from API
            const following: User[] = [];
            for (let i = 11; i <= 20; i++) {
                following.push(await this.getUserProfile(i.toString()));
            }
            return following;
        } catch (error) {
            console.error('Failed to get following:', error);
            return [];
        }
    }

    public async searchUsers(query: string): Promise<User[]> {
        try {
            // Mock user search - in production, this would search the database
            const users: User[] = [];
            for (let i = 1; i <= 5; i++) {
                const user = await this.getUserProfile(i.toString());
                if (user.username.toLowerCase().includes(query.toLowerCase()) ||
                    user.fullName.toLowerCase().includes(query.toLowerCase())) {
                    users.push(user);
                }
            }
            return users;
        } catch (error) {
            console.error('Failed to search users:', error);
            return [];
        }
    }

    public async getTrendingTags(): Promise<string[]> {
        return ['nft', 'photography', 'vintage', 'digital_art', 'collectibles'];
    }

    public async getSuggestedUsers(): Promise<User[]> {
        try {
            // Mock suggested users - in production, this would use recommendation algorithms
            const suggestions: User[] = [];
            for (let i = 21; i <= 25; i++) {
                suggestions.push(await this.getUserProfile(i.toString()));
            }
            return suggestions;
        } catch (error) {
            console.error('Failed to get suggested users:', error);
            return [];
        }
    }

    public getCurrentUser(): User | null {
        return this.currentUser;
    }

    public async updateProfile(updates: Partial<User>): Promise<User> {
        if (!this.currentUser) {
            throw new Error('User not authenticated');
        }

        try {
            this.currentUser = { ...this.currentUser, ...updates };
            // In production, this would update the backend
            console.log('Profile updated:', this.currentUser);
            return this.currentUser;
        } catch (error) {
            console.error('Failed to update profile:', error);
            throw error;
        }
    }

    public clearCache() {
        this.feedCache.clear();
        this.userCache.clear();
    }
}

// Create singleton instance
export const socialService = new SocialService();

// Make social service globally available
if (typeof window !== 'undefined') {
    (window as any).socialService = socialService;
}
