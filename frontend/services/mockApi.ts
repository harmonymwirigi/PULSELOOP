// frontend/services/mockApi.ts

import { User, Post, Comment, ReactionType, Resource, Blog, CreateResourceData, CreateBlogData, ChatMessage, DisplayNamePreference, Invitation, Notification, BroadcastMessage } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const BACKEND_BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

// Utility function to convert relative URLs to absolute URLs
const getAbsoluteUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    if (url.startsWith('http')) return url; // Already absolute
    if (url.startsWith('/uploads/')) return `${BACKEND_BASE_URL}${url}`;
    return url;
};

const handleApiResponse = async (response: Response) => {
    if (response.status === 401) {
        // Unauthorized, clear session and reload
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        window.location.reload();
        throw new Error('Unauthorized');
    }
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'An unknown error occurred' }));
        throw new Error(errorData.error || response.statusText);
    }
    return response.json();
}

const getAuthHeaders = () => {
    const token = localStorage.getItem('accessToken');
    const headers: HeadersInit = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
};

const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
    const headers = { ...getAuthHeaders(), ...options.headers };
    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }
    const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
    return response; // Return the raw response, let handleApiResponse be called separately
};

// --- AUTH ---
export const login = async (email: string, password: string): Promise<{ accessToken: string; user: User }> => {
    const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });
    return handleApiResponse(response);
};

export const signup = async (name: string, email: string, password: string, invitationToken?: string): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, invitationToken }),
    });
    return handleApiResponse(response);
};

export const getUserById = async (userId: string): Promise<User> => {
    const response = await fetchWithAuth(`/users/${userId}`);
    const user = await handleApiResponse(response);
    
    // Convert relative URLs to absolute URLs for avatar
    return {
        ...user,
        avatarUrl: getAbsoluteUrl(user.avatarUrl)
    };
};

// --- USER PROFILE ---
export interface UpdateProfileData {
    title?: string;
    department?: string;
    state?: string;
    bio?: string;
}

export const updateProfile = async (data: UpdateProfileData): Promise<User> => {
    const response = await fetchWithAuth('/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
    });
    return handleApiResponse(response);
};

export const updateAvatar = async (avatarFile: File): Promise<User> => {
    const formData = new FormData();
    formData.append('avatarFile', avatarFile);
    const response = await fetchWithAuth('/profile/avatar', {
        method: 'POST',
        body: formData,
    });
    return handleApiResponse(response);
};


// --- POSTS ---
// Simple cache for posts to reduce API calls
const postsCache = new Map<string, { data: { posts: Post[], total: number }, timestamp: number }>();
const CACHE_DURATION = 30000; // 30 seconds

export const getPosts = async (page: number, limit: number, tag?: string): Promise<{ posts: Post[], total: number }> => {
    const cacheKey = `posts_${page}_${limit}_${tag || 'all'}`;
    const cached = postsCache.get(cacheKey);
    
    // Return cached data if it's still fresh
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return Promise.resolve(cached.data);
    }
    
    let endpoint = `/posts?page=${page}&limit=${limit}`;
    if (tag) {
        endpoint += `&tag=${encodeURIComponent(tag)}`;
    }
    
    const response = await fetchWithAuth(endpoint);
    const data = await handleApiResponse(response);
    
    // Convert relative URLs to absolute URLs for media and avatars
    if (data && data.posts) {
        data.posts = data.posts.map((post: Post) => ({
            ...post,
            mediaUrl: getAbsoluteUrl(post.mediaUrl),
            author: {
                ...post.author,
                avatarUrl: getAbsoluteUrl(post.author.avatarUrl)
            }
        }));
    }
    
    // Cache the result
    postsCache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
};

export const createPost = async (text: string, mediaFile: File | null, displayNamePreference: DisplayNamePreference, tags: string[]): Promise<Post> => {
    const formData = new FormData();
    formData.append('text', text);
    formData.append('displayNamePreference', displayNamePreference);
    formData.append('tags', JSON.stringify(tags)); // Send tags as a JSON string array
    if (mediaFile) {
        formData.append('mediaFile', mediaFile);
    }
    const response = await fetchWithAuth('/posts', {
        method: 'POST',
        body: formData,
    });
    const post = await handleApiResponse(response);
    
    // Convert relative URLs to absolute URLs for media and avatars
    return {
        ...post,
        mediaUrl: getAbsoluteUrl(post.mediaUrl),
        author: {
            ...post.author,
            avatarUrl: getAbsoluteUrl(post.author.avatarUrl)
        }
    };
};

export const updatePost = async (postId: string, text: string, tags: string[]): Promise<Post> => {
    const response = await fetchWithAuth(`/posts/${postId}`, {
        method: 'PUT',
        body: JSON.stringify({ text, tags }),
    });
    const post = await handleApiResponse(response);
    
    // Convert relative URLs to absolute URLs for media and avatars
    return {
        ...post,
        mediaUrl: getAbsoluteUrl(post.mediaUrl),
        author: {
            ...post.author,
            avatarUrl: getAbsoluteUrl(post.author.avatarUrl)
        }
    };
};

// --- REACTIONS ---
export const toggleReaction = async (postId: string, type: ReactionType): Promise<{ message: string }> => {
    const response = await fetchWithAuth(`/posts/${postId}/reactions`, {
        method: 'POST',
        body: JSON.stringify({ type }),
    });
    return handleApiResponse(response);
};

// --- COMMENTS ---
export const addComment = async (postId: string, text: string, parentCommentId?: string): Promise<Comment> => {
    const response = await fetchWithAuth(`/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ text, parentCommentId }),
    });
    return handleApiResponse(response);
};

// --- ADMIN ---
export const getPendingUsers = async (): Promise<User[]> => {
    const response = await fetchWithAuth('/admin/pending-users');
    return handleApiResponse(response);
};

export const approveUser = async (userId: string): Promise<User> => {
    const response = await fetchWithAuth(`/admin/approve-user/${userId}`, { method: 'PUT' });
    return handleApiResponse(response);
};

export const getAllUsers = async (): Promise<User[]> => {
    const response = await fetchWithAuth('/admin/users');
    return handleApiResponse(response);
};

export const updateUserRole = async (userId: string, role: string): Promise<User> => {
    const response = await fetchWithAuth(`/admin/users/${userId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role })
    });
    return handleApiResponse(response);
};

export const deleteUser = async (userId: string): Promise<{ message: string }> => {
    const response = await fetchWithAuth(`/admin/users/${userId}`, { method: 'DELETE' });
    return handleApiResponse(response);
};

export const getPendingResources = async (): Promise<Resource[]> => {
    const response = await fetchWithAuth('/admin/pending-resources');
    return handleApiResponse(response);
};

export const approveResource = async (resourceId: string): Promise<Resource> => {
    const response = await fetchWithAuth(`/admin/approve-resource/${resourceId}`, { method: 'PUT' });
    return handleApiResponse(response);
};

export const getPendingBlogs = async (): Promise<Blog[]> => {
    const response = await fetchWithAuth('/admin/pending-blogs');
    const blogs = await handleApiResponse(response);
    
    // Convert relative URLs to absolute URLs for cover images and avatars
    return blogs.map((blog: Blog) => ({
        ...blog,
        coverImageUrl: getAbsoluteUrl(blog.coverImageUrl),
        author: {
            ...blog.author,
            avatarUrl: getAbsoluteUrl(blog.author.avatarUrl)
        }
    }));
};

export const approveBlog = async (blogId: string): Promise<Blog> => {
    const response = await fetchWithAuth(`/admin/approve-blog/${blogId}`, { method: 'PUT' });
    const blog = await handleApiResponse(response);
    
    // Convert relative URLs to absolute URLs for cover images and avatars
    return {
        ...blog,
        coverImageUrl: getAbsoluteUrl(blog.coverImageUrl),
        author: {
            ...blog.author,
            avatarUrl: getAbsoluteUrl(blog.author.avatarUrl)
        }
    };
};


// --- RESOURCES ---
export const getResources = async (): Promise<Resource[]> => {
    const response = await fetchWithAuth('/resources');
    return handleApiResponse(response);
};

export const createResource = async (data: CreateResourceData): Promise<Resource> => {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('type', data.type);
    if (data.description) formData.append('description', data.description);
    if (data.content) formData.append('content', data.content);
    if (data.file) formData.append('file', data.file);

    const response = await fetchWithAuth('/resources', {
        method: 'POST',
        body: formData,
    });
    return handleApiResponse(response);
};

// --- BLOGS ---
export const getBlogs = async (): Promise<Blog[]> => {
    const response = await fetchWithAuth('/blogs');
    const blogs = await handleApiResponse(response);
    
    // Convert relative URLs to absolute URLs for cover images and avatars
    return blogs.map((blog: Blog) => ({
        ...blog,
        coverImageUrl: getAbsoluteUrl(blog.coverImageUrl),
        author: {
            ...blog.author,
            avatarUrl: getAbsoluteUrl(blog.author.avatarUrl)
        }
    }));
};

export const createBlog = async (data: CreateBlogData): Promise<Blog> => {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('content', data.content);
    if (data.coverImage) {
        formData.append('coverImage', data.coverImage);
    }

    const response = await fetchWithAuth('/blogs', {
        method: 'POST',
        body: formData,
    });
    const blog = await handleApiResponse(response);
    
    // Convert relative URLs to absolute URLs for cover images and avatars
    return {
        ...blog,
        coverImageUrl: getAbsoluteUrl(blog.coverImageUrl),
        author: {
            ...blog.author,
            avatarUrl: getAbsoluteUrl(blog.author.avatarUrl)
        }
    };
};

// --- AI CHAT ---
export const getAiChatResponse = async (message: string, history: ChatMessage[]): Promise<{ reply: string }> => {
    const response = await fetchWithAuth('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message, history }),
    });
    return handleApiResponse(response);
};

// --- INVITATIONS ---
export const getSentInvitations = async (): Promise<Invitation[]> => {
    const response = await fetchWithAuth('/invitations/sent');
    return handleApiResponse(response);
};

export const sendInvitation = async (email: string): Promise<{ message: string }> => {
    const response = await fetchWithAuth('/invitations', {
        method: 'POST',
        body: JSON.stringify({ email }),
    });
    return handleApiResponse(response);
};

export const validateInvitationToken = async (token: string): Promise<{ email: string }> => {
    const response = await fetch(`${API_BASE_URL}/invitations/${token}`);
    return handleApiResponse(response);
};

// --- TRENDING TOPICS ---
export interface TrendingTopic {
    tag: string;
    post_count: number;
    comment_count: number;
    reaction_count: number;
    score: number;
}

export interface TrendingTopicsResponse {
    trending_topics: TrendingTopic[];
    period: string;
    total_topics: number;
}

export const getTrendingTopics = async (limit: number = 10, period: string = '24h'): Promise<TrendingTopicsResponse> => {
    const response = await fetch(`${API_BASE_URL}/trending-topics?limit=${limit}&period=${period}`);
    return handleApiResponse(response);
};

// --- ENHANCED DISCUSSION API ---

export const reactToComment = async (commentId: string, reactionType: string): Promise<void> => {
    const response = await fetchWithAuth(`/comments/${commentId}/reactions`, {
        method: 'POST',
        body: JSON.stringify({ type: reactionType }),
    });
    return handleApiResponse(response);
};

export const getDiscussionAnalytics = async (postId: string): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/posts/${postId}/discussion-analytics`);
    return handleApiResponse(response);
};

// --- NOTIFICATION API ---
export const getNotifications = async (page: number = 1, limit: number = 20, unreadOnly: boolean = false): Promise<{ notifications: Notification[], total: number, pages: number, current_page: number }> => {
    const response = await fetchWithAuth(`/notifications?page=${page}&limit=${limit}&unread_only=${unreadOnly}`);
    return handleApiResponse(response);
};

export const markNotificationRead = async (notificationId: string): Promise<void> => {
    const response = await fetchWithAuth(`/notifications/${notificationId}/read`, {
        method: 'PUT',
    });
    return handleApiResponse(response);
};

export const markAllNotificationsRead = async (): Promise<void> => {
    const response = await fetchWithAuth('/notifications/read-all', {
        method: 'PUT',
    });
    return handleApiResponse(response);
};

export const getUnreadCount = async (): Promise<{ unread_count: number }> => {
    const response = await fetchWithAuth('/notifications/unread-count');
    return handleApiResponse(response);
};

// --- BROADCAST MESSAGE API FUNCTIONS ---

export const getActiveBroadcastMessage = async (): Promise<{ message: BroadcastMessage | null }> => {
    const response = await fetch(`${API_BASE_URL}/broadcast-messages`);
    return handleApiResponse(response);
};

export const getAllBroadcastMessages = async (): Promise<BroadcastMessage[]> => {
    const response = await fetchWithAuth('/admin/broadcast-messages');
    return handleApiResponse(response);
};

export const createBroadcastMessage = async (data: { title: string; message: string }): Promise<BroadcastMessage> => {
    const response = await fetchWithAuth('/admin/broadcast-messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });
    return handleApiResponse(response);
};

export const updateBroadcastMessage = async (messageId: string, data: { title?: string; message?: string; is_active?: boolean }): Promise<BroadcastMessage> => {
    const response = await fetchWithAuth(`/admin/broadcast-messages/${messageId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });
    return handleApiResponse(response);
};

export const deleteBroadcastMessage = async (messageId: string): Promise<{ message: string }> => {
    const response = await fetchWithAuth(`/admin/broadcast-messages/${messageId}`, {
        method: 'DELETE',
    });
    return handleApiResponse(response);
};

// Password Reset Functions
export const forgotPassword = async (email: string): Promise<{ message: string }> => {
    const response = await fetch(`${BACKEND_BASE_URL}/api/forgot-password`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
    });
    return handleApiResponse(response);
};

export const resetPassword = async (token: string, newPassword: string): Promise<{ message: string }> => {
    const response = await fetch(`${BACKEND_BASE_URL}/api/reset-password`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, newPassword }),
    });
    return handleApiResponse(response);
};