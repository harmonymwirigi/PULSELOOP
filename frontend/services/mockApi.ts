// frontend/services/mockApi.ts

import { User, Post, Comment, ReactionType, Resource, Blog, CreateResourceData, CreateBlogData, ChatMessage, DisplayNamePreference, Invitation, Notification, BroadcastMessage, Feedback, Conversation, ConversationMessage, ConversationReaction, NclexCourse, NclexCourseResource, NclexCourseStatus, NclexResourceType, NclexEnrollment, NclexAttempt, NclexQuestion, NclexResourceProgress, NclexResourceProgressStatus, Promotion } from '../types';

// Auto-detect production environment and set appropriate API URL
const getApiBaseUrl = () => {
    const hostname = window.location.hostname;
    console.log('🔍 Detecting environment - hostname:', hostname);
    
    // Check if we're in production (hosted on pulseloopcare.com)
    if (hostname === 'pulseloopcare.com' || hostname === 'www.pulseloopcare.com' || hostname.includes('pulseloopcare.com')) {
        console.log('✅ Production environment detected');
        return 'https://pulseloopcare.com/api';
    }
    
    // Use environment variable if set, otherwise default to localhost for development
    const envUrl = (import.meta as any).env?.VITE_API_URL;
    console.log('🔧 Environment URL:', envUrl);
    return envUrl || 'http://localhost:5000/api';
};

const getBackendBaseUrl = () => {
    const hostname = window.location.hostname;
    
    // Check if we're in production (hosted on pulseloopcare.com)
    if (hostname === 'pulseloopcare.com' || hostname === 'www.pulseloopcare.com' || hostname.includes('pulseloopcare.com')) {
        return 'https://pulseloopcare.com';
    }
    
    // Use environment variable if set, otherwise default to localhost for development
    const envUrl = (import.meta as any).env?.VITE_API_URL;
    return envUrl?.replace('/api', '') || 'http://localhost:5000';
};

const API_BASE_URL = getApiBaseUrl();
const BACKEND_BASE_URL = getBackendBaseUrl();

// Debug logging for API URL detection
console.log('🔧 API Configuration:', {
    hostname: window.location.hostname,
    apiBaseUrl: API_BASE_URL,
    backendBaseUrl: BACKEND_BASE_URL,
    isProduction: window.location.hostname === 'pulseloopcare.com' || window.location.hostname === 'www.pulseloopcare.com',
    userAgent: navigator.userAgent,
    location: window.location.href
});

// Utility function to convert relative URLs to absolute URLs
const getAbsoluteUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    if (url.startsWith('http')) return url; // Already absolute
    if (url.startsWith('/uploads/')) return `${BACKEND_BASE_URL}${url}`;
    return url;
};

const normalizeNclexEnrollment = (enrollment: NclexEnrollment | undefined | null): NclexEnrollment | null => {
    if (!enrollment) return null;
    return {
        ...enrollment,
        progressPercent: Number(enrollment.progressPercent ?? 0),
        latestScorePercent: enrollment.latestScorePercent !== undefined && enrollment.latestScorePercent !== null
            ? Number(enrollment.latestScorePercent)
            : undefined,
        attempts: (enrollment.attempts || []).map((attempt: NclexAttempt) => ({
            ...attempt,
            answers: (attempt.answers || []).map(answer => ({
                ...answer,
                options: (answer.options || []).map(option => ({ ...option })),
            })),
        })),
        resourceProgress: (enrollment.resourceProgress || []).map((progress: NclexResourceProgress) => ({
            ...progress,
            completedAt: progress.completedAt || null,
            createdAt: progress.createdAt || null,
            updatedAt: progress.updatedAt || null,
        })),
    };
};

const normalizeNclexCourse = (course: NclexCourse | undefined | null): NclexCourse | null => {
    if (!course) return null;
    const normalizedEnrollment = normalizeNclexEnrollment(course.enrollment);
    return {
        ...course,
        resources: (course.resources || []).map((resource: NclexCourseResource) => ({
            ...resource,
            url: getAbsoluteUrl(resource.url) || resource.url,
            progressStatus: resource.progressStatus || null,
            completedAt: resource.completedAt || null,
        })),
        questions: (course.questions || []).map(question => ({
            ...question,
            options: (question.options || []).map(option => ({ ...option })),
        })),
        enrollment: normalizedEnrollment || undefined,
        resourceProgress: (course.resourceProgress || []).map((progress: NclexResourceProgress) => ({
            ...progress,
            completedAt: progress.completedAt || null,
            createdAt: progress.createdAt || null,
            updatedAt: progress.updatedAt || null,
        })),
    };
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
    const fullUrl = `${API_BASE_URL}${endpoint}`;
    console.log('🌐 Making API call:', {
        endpoint,
        fullUrl,
        method: options.method || 'GET',
        apiBaseUrl: API_BASE_URL
    });
    const response = await fetch(fullUrl, { ...options, headers });
    return response; // Return the raw response, let handleApiResponse be called separately
};

// --- GLOBAL SEARCH ---
export interface SearchResult {
    id: string;
    type: 'post' | 'resource' | 'blog' | 'user';
    title: string;
    content: string;
    author?: string;
    createdAt: string;
    url: string;
}

export const searchAll = async (query: string): Promise<SearchResult[]> => {
    const response = await fetchWithAuth(`/search?q=${encodeURIComponent(query)}`);
    const data = await handleApiResponse(response);
    return data.results || [];
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

export const signup = async (name: string, email: string, password: string, title?: string, state?: string, invitationToken?: string): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, title, state, invitationToken }),
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
    isBusiness?: boolean;
    businessName?: string;
    businessDescription?: string;
    businessWebsite?: string;
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
    const user = await handleApiResponse(response);
    // Normalize avatar URL to absolute so it loads correctly in the frontend
    return {
        ...user,
        avatarUrl: getAbsoluteUrl(user.avatarUrl),
    };
};

// --- BUSINESS PROMOTIONS ---

export interface CreatePromotionData {
    title: string;
    description?: string;
    imageUrl?: string;
    targetUrl?: string;
}

export const createPromotion = async (data: CreatePromotionData): Promise<Promotion> => {
    const response = await fetchWithAuth('/promotions', {
        method: 'POST',
        body: JSON.stringify(data),
    });
    return handleApiResponse(response);
};

export type PromotionStatusFilter = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL';

export const getPromotions = async (
    status: PromotionStatusFilter = 'APPROVED',
    options?: { includeInactive?: boolean }
): Promise<Promotion[]> => {
    const params = new URLSearchParams();
    if (status && status !== 'ALL') {
        params.append('status', status);
    }
    if (options?.includeInactive) {
        params.append('includeInactive', 'true');
    }

    const queryString = params.toString();
    const endpoint = queryString ? `/promotions?${queryString}` : '/promotions';

    const response = await fetchWithAuth(endpoint);
    const data = await handleApiResponse(response);
    return data.promotions || [];
};

export const getMyPromotions = async (): Promise<Promotion[]> => {
    const response = await fetchWithAuth('/business/promotions');
    const data = await handleApiResponse(response);
    return data.promotions || [];
};

export interface AdminUpdatePromotionOptions {
    status: 'APPROVED' | 'REJECTED';
    isActive?: boolean;
    durationDays?: number;
    startAt?: string;
    endAt?: string;
}

export const adminUpdatePromotionStatus = async (
    promotionId: string,
    options: AdminUpdatePromotionOptions
): Promise<Promotion> => {
    const response = await fetchWithAuth(`/admin/promotions/${promotionId}/status`, {
        method: 'PATCH',
        body: JSON.stringify(options),
    });
    return handleApiResponse(response);
};

export interface UpdatePromotionData {
    title?: string;
    description?: string | null;
    imageUrl?: string | null;
    targetUrl?: string | null;
}

export const updatePromotion = async (promotionId: string, data: UpdatePromotionData): Promise<Promotion> => {
    const response = await fetchWithAuth(`/promotions/${promotionId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
    });
    return handleApiResponse(response);
};

// --- NEWSLETTERS (ADMIN) ---

export interface NewsletterDraft {
    subject: string;
    htmlBody: string;
    textBody: string;
}

export const generateNewsletter = async (): Promise<NewsletterDraft> => {
    const response = await fetchWithAuth('/admin/newsletters/generate', {
        method: 'POST',
    });
    return handleApiResponse(response);
};

export const sendNewsletter = async (draft: NewsletterDraft): Promise<{ message: string; recipients: number; total: number }> => {
    const response = await fetchWithAuth('/admin/newsletters/send', {
        method: 'POST',
        body: JSON.stringify(draft),
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
            },
            // Derive isStory flag in the frontend based on tags; default is false (normal feed post)
            isStory: !!post.tags?.includes('story'),
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
        },
        isStory: !!post.tags?.includes('story'),
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
        },
        isStory: !!post.tags?.includes('story'),
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
    const users = await handleApiResponse(response);
    // Normalize avatar URLs for admin lists and profile views
    return (users || []).map((u: User) => ({
        ...u,
        avatarUrl: getAbsoluteUrl(u.avatarUrl),
    }));
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

export const getAllResources = async (): Promise<Resource[]> => {
    const response = await fetchWithAuth('/admin/all-resources');
    return handleApiResponse(response);
};

export const approveResource = async (resourceId: string): Promise<Resource> => {
    console.log('🔍 Approving resource with ID:', resourceId);
    const response = await fetchWithAuth(`/admin/approve-resource/${resourceId}`, { method: 'PUT' });
    console.log('📡 Approve resource response status:', response.status);
    if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Approve resource error:', errorText);
    }
    return handleApiResponse(response);
};

export const rejectResource = async (resourceId: string, rejectionReason: string): Promise<Resource> => {
    const response = await fetchWithAuth(`/admin/reject-resource/${resourceId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rejectionReason }),
    });
    return handleApiResponse(response);
};

export const inactivateResource = async (resourceId: string): Promise<Resource> => {
    const response = await fetchWithAuth(`/admin/inactivate-resource/${resourceId}`, {
        method: 'PUT',
    });
    return handleApiResponse(response);
};

export const reactivateResource = async (resourceId: string): Promise<Resource> => {
    const response = await fetchWithAuth(`/admin/reactivate-resource/${resourceId}`, {
        method: 'PUT',
    });
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

export const getAllBlogs = async (): Promise<Blog[]> => {
    const response = await fetchWithAuth('/admin/all-blogs');
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

export const rejectBlog = async (blogId: string, rejectionReason: string): Promise<Blog> => {
    const response = await fetchWithAuth(`/admin/reject-blog/${blogId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rejectionReason }),
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

export const inactivateBlog = async (blogId: string): Promise<Blog> => {
    const response = await fetchWithAuth(`/admin/inactivate-blog/${blogId}`, {
        method: 'PUT',
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

export const reactivateBlog = async (blogId: string): Promise<Blog> => {
    const response = await fetchWithAuth(`/admin/reactivate-blog/${blogId}`, {
        method: 'PUT',
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

// --- NCLEX COURSES ---

export interface CreateNclexCoursePayload {
    title: string;
    description: string;
    status?: NclexCourseStatus;
}

export interface UpdateNclexCoursePayload {
    title?: string;
    description?: string;
    status?: NclexCourseStatus;
}

export interface CreateNclexResourcePayload {
    resourceType: NclexResourceType;
    title: string;
    description?: string;
    url?: string;
    file?: File;
}

export interface GenerateNclexQuestionsPayload {
    questionCount?: number;
    replaceExisting?: boolean;
    prompt?: string;
}

export const createNclexCourse = async (payload: CreateNclexCoursePayload): Promise<NclexCourse> => {
    const response = await fetchWithAuth('/nclex/courses', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
    const course = await handleApiResponse(response);
    return normalizeNclexCourse(course)!;
};

export const updateNclexCourse = async (courseId: string, payload: UpdateNclexCoursePayload): Promise<NclexCourse> => {
    const response = await fetchWithAuth(`/nclex/courses/${courseId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
    const course = await handleApiResponse(response);
    return normalizeNclexCourse(course)!;
};

export const deleteNclexCourse = async (courseId: string): Promise<{ message: string }> => {
    const response = await fetchWithAuth(`/nclex/courses/${courseId}`, {
        method: 'DELETE',
    });
    return handleApiResponse(response);
};

export const getNclexCourses = async (includeDetails: boolean = false): Promise<NclexCourse[]> => {
    const response = await fetchWithAuth(`/nclex/courses?includeDetails=${includeDetails ? 1 : 0}`);
    const courses: NclexCourse[] = await handleApiResponse(response);
    return courses.map(course => normalizeNclexCourse(course)!).filter(Boolean) as NclexCourse[];
};

export const getAdminNclexCourses = async (includeDetails: boolean = true, status?: NclexCourseStatus): Promise<NclexCourse[]> => {
    let endpoint = `/nclex/courses?scope=ADMIN&includeDetails=${includeDetails ? 1 : 0}`;
    if (status) {
        endpoint += `&status=${encodeURIComponent(status)}`;
    }
    const response = await fetchWithAuth(endpoint);
    const courses: NclexCourse[] = await handleApiResponse(response);
    return courses.map(course => normalizeNclexCourse(course)!).filter(Boolean) as NclexCourse[];
};

export const getNclexCourse = async (courseId: string): Promise<NclexCourse> => {
    const response = await fetchWithAuth(`/nclex/courses/${courseId}`);
    const course = await handleApiResponse(response);
    return normalizeNclexCourse(course)!;
};

export const addNclexCourseResource = async (courseId: string, payload: CreateNclexResourcePayload): Promise<NclexCourseResource> => {
    const isUpload = payload.resourceType === 'VIDEO_UPLOAD' || payload.resourceType === 'PDF_UPLOAD';
    let response: Response;

    if (isUpload) {
        const formData = new FormData();
        formData.append('resourceType', payload.resourceType);
        formData.append('title', payload.title);
        if (payload.description) formData.append('description', payload.description);
        if (payload.file) formData.append('file', payload.file);
        if (payload.url) formData.append('url', payload.url);

        response = await fetchWithAuth(`/nclex/courses/${courseId}/resources`, {
            method: 'POST',
            body: formData,
        });
    } else {
        response = await fetchWithAuth(`/nclex/courses/${courseId}/resources`, {
            method: 'POST',
            body: JSON.stringify({
                resourceType: payload.resourceType,
                title: payload.title,
                description: payload.description,
                url: payload.url,
            }),
        });
    }

    const resource = await handleApiResponse(response);
    return {
        ...resource,
        url: getAbsoluteUrl(resource.url) || resource.url,
    };
};

export const deleteNclexCourseResource = async (courseId: string, resourceId: string): Promise<{ message: string }> => {
    const response = await fetchWithAuth(`/nclex/courses/${courseId}/resources/${resourceId}`, {
        method: 'DELETE',
    });
    return handleApiResponse(response);
};

export const updateNclexResourceProgress = async (
    courseId: string,
    resourceId: string,
    status: NclexResourceProgressStatus
): Promise<NclexCourse> => {
    const response = await fetchWithAuth(`/nclex/courses/${courseId}/resources/${resourceId}/progress`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
    });
    const result = await handleApiResponse(response);
    return normalizeNclexCourse(result.course)!;
};

export const generateNclexQuestions = async (courseId: string, payload: GenerateNclexQuestionsPayload = {}): Promise<NclexQuestion[]> => {
    const response = await fetchWithAuth(`/nclex/courses/${courseId}/generate-questions`, {
        method: 'POST',
        body: JSON.stringify(payload),
    });
    return handleApiResponse(response);
};

export interface CreateNclexQuestionPayload {
    questionText: string;
    explanation?: string;
    options: Array<{
        optionText: string;
        isCorrect: boolean;
        feedback?: string;
    }>;
}

export interface UpdateNclexQuestionPayload {
    questionText?: string;
    explanation?: string;
    options?: Array<{
        optionText: string;
        isCorrect: boolean;
        feedback?: string;
    }>;
}

export const createNclexQuestion = async (courseId: string, payload: CreateNclexQuestionPayload): Promise<NclexQuestion> => {
    const response = await fetchWithAuth(`/nclex/courses/${courseId}/questions`, {
        method: 'POST',
        body: JSON.stringify(payload),
    });
    return handleApiResponse(response);
};

export const updateNclexQuestion = async (courseId: string, questionId: string, payload: UpdateNclexQuestionPayload): Promise<NclexQuestion> => {
    const response = await fetchWithAuth(`/nclex/courses/${courseId}/questions/${questionId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
    return handleApiResponse(response);
};

export const deleteNclexQuestion = async (courseId: string, questionId: string): Promise<{ message: string }> => {
    const response = await fetchWithAuth(`/nclex/courses/${courseId}/questions/${questionId}`, {
        method: 'DELETE',
    });
    return handleApiResponse(response);
};

export const subscribeToNclexCourse = async (courseId: string): Promise<NclexEnrollment> => {
    const response = await fetchWithAuth(`/nclex/courses/${courseId}/subscribe`, {
        method: 'POST',
    });
    const enrollment = await handleApiResponse(response);
    return normalizeNclexEnrollment(enrollment)!;
};

export interface SubmitNclexAttemptPayload {
    answers: Array<{ questionId: string; selectedOptionId?: string | null }>;
}

export interface SubmitNclexAttemptResponse {
    attempt: NclexAttempt;
    enrollment: NclexEnrollment;
}

export const submitNclexAttempt = async (courseId: string, payload: SubmitNclexAttemptPayload): Promise<SubmitNclexAttemptResponse> => {
    const response = await fetchWithAuth(`/nclex/courses/${courseId}/attempts`, {
        method: 'POST',
        body: JSON.stringify(payload),
    });
    const result = await handleApiResponse(response);
    return {
        attempt: {
            ...result.attempt,
            answers: (result.attempt.answers || []).map((answer: any) => ({
                ...answer,
                options: (answer.options || []).map((option: any) => ({ ...option })),
            })),
        },
        enrollment: normalizeNclexEnrollment(result.enrollment)!,
    };
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

export const getPublicBlogs = async (): Promise<Blog[]> => {
    const response = await fetch(`${API_BASE_URL}/public/blogs`);
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

export const getPublicResources = async (): Promise<Resource[]> => {
    const response = await fetch(`${API_BASE_URL}/public/resources`);
    const resources = await handleApiResponse(response);
    
    // Convert relative URLs to absolute URLs for resource file URLs and avatars
    return resources.map((resource: Resource) => ({
        ...resource,
        file_url: resource.file_url ? getAbsoluteUrl(resource.file_url) : resource.file_url,
        author: {
            ...resource.author,
            avatarUrl: getAbsoluteUrl(resource.author.avatarUrl)
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

// --- FEEDBACK ---
export const createFeedback = async (content: string, rating: number): Promise<Feedback> => {
    const response = await fetchWithAuth('/feedbacks', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content, rating }),
    });
    return handleApiResponse(response);
};

export const getPublicFeedbacks = async (): Promise<Feedback[]> => {
    const response = await fetch(`${API_BASE_URL}/public/feedbacks`);
    return handleApiResponse(response);
};

export const getUserFeedbacks = async (): Promise<Feedback[]> => {
    const response = await fetchWithAuth('/feedbacks');
    return handleApiResponse(response);
};

export const getAllFeedbacks = async (): Promise<Feedback[]> => {
    const response = await fetchWithAuth('/admin/feedbacks');
    return handleApiResponse(response);
};

export const updateFeedbackStatus = async (feedbackId: string, status: 'APPROVED' | 'REJECTED' | 'PENDING'): Promise<Feedback> => {
    const response = await fetchWithAuth(`/admin/feedbacks/${feedbackId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
    });
    return handleApiResponse(response);
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

// --- USERS DIRECTORY (PUBLIC FOR LOGGED-IN USERS) ---
export const getUsersDirectory = async (query?: string): Promise<User[]> => {
    const endpoint = query && query.trim()
        ? `/users?q=${encodeURIComponent(query.trim())}`
        : '/users';
    const response = await fetchWithAuth(endpoint);
    const users = await handleApiResponse(response);
    // Normalize avatar URLs for professionals directory
    return (users || []).map((u: User) => ({
        ...u,
        avatarUrl: getAbsoluteUrl(u.avatarUrl),
    }));
};

export const getAllBroadcastMessages = async (): Promise<BroadcastMessage[]> => {
    const response = await fetchWithAuth('/admin/broadcast-messages');
    return handleApiResponse(response);
};

export const createBroadcastMessage = async (data: { title: string; message: string; imageUrl?: string }): Promise<BroadcastMessage> => {
    const response = await fetchWithAuth('/admin/broadcast-messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });
    return handleApiResponse(response);
};

export const updateBroadcastMessage = async (messageId: string, data: { title?: string; message?: string; imageUrl?: string; is_active?: boolean; is_visible?: boolean }): Promise<BroadcastMessage> => {
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

export const toggleBroadcastMessageVisibility = async (messageId: string): Promise<{ message: string; isVisible: boolean }> => {
    const response = await fetchWithAuth(`/admin/broadcast-messages/${messageId}/toggle-visibility`, {
        method: 'PUT',
    });
    return handleApiResponse(response);
};

export const uploadImage = async (file: File): Promise<{ imageUrl: string }> => {
    const formData = new FormData();
    formData.append('image', file);
    
    const response = await fetchWithAuth('/upload-image', {
        method: 'POST',
        body: formData,
    });
    return handleApiResponse(response);
};

export const uploadMedia = async (file: File): Promise<{ imageUrl: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetchWithAuth('/upload-media', {
        method: 'POST',
        body: formData,
    });
    return handleApiResponse(response);
};

export const getAllPosts = async (): Promise<Post[]> => {
    const response = await fetchWithAuth('/admin/posts');
    return handleApiResponse(response);
};

export const deletePost = async (postId: string): Promise<{ message: string }> => {
    const response = await fetchWithAuth(`/posts/${postId}`, {
        method: 'DELETE',
    });
    return handleApiResponse(response);
};

export const adminDeletePost = async (postId: string): Promise<{ message: string }> => {
    const response = await fetchWithAuth(`/admin/posts/${postId}`, {
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

// --- CONVERSATION API ---

export const getConversations = async (): Promise<Conversation[]> => {
    const response = await fetchWithAuth('/conversations');
    return handleApiResponse(response);
};

export const createConversation = async (title: string, description: string): Promise<Conversation> => {
    const response = await fetchWithAuth('/conversations', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, description }),
    });
    return handleApiResponse(response);
};

export const updateConversation = async (conversationId: string, status: 'ACTIVE' | 'INACTIVE'): Promise<Conversation> => {
    const response = await fetchWithAuth(`/conversations/${conversationId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
    });
    return handleApiResponse(response);
};

export const deleteConversation = async (conversationId: string): Promise<void> => {
    const response = await fetchWithAuth(`/conversations/${conversationId}`, {
        method: 'DELETE',
    });
    return handleApiResponse(response);
};

export const getConversationMessages = async (conversationId: string): Promise<ConversationMessage[]> => {
    const response = await fetchWithAuth(`/conversations/${conversationId}/messages`);
    return handleApiResponse(response);
};

export const createConversationMessage = async (conversationId: string, message: string): Promise<ConversationMessage> => {
    const response = await fetchWithAuth(`/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
    });
    return handleApiResponse(response);
};

export const addConversationReaction = async (messageId: string, type: ReactionType): Promise<ConversationReaction> => {
    const response = await fetchWithAuth(`/conversations/messages/${messageId}/reactions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type }),
    });
    return handleApiResponse(response);
};

export const removeConversationReaction = async (messageId: string, reactionId: string): Promise<void> => {
    const response = await fetchWithAuth(`/conversations/messages/${messageId}/reactions/${reactionId}`, {
        method: 'DELETE',
    });
    return handleApiResponse(response);
};

// Export the getAbsoluteUrl function for use in other components
export { getAbsoluteUrl };