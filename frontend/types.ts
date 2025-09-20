

export enum Role {
    ADMIN = 'ADMIN',
    NURSE = 'NURSE',
    PENDING = 'PENDING',
}

// FIX: Added a shared View type to resolve type conflicts.
export type View = 'FEED' | 'ADMIN' | 'PROFILE' | 'RESOURCES' | 'BLOGS' | 'SINGLE_POST' | 'LOGIN' | 'SIGNUP' | 'SINGLE_RESOURCE' | 'SINGLE_BLOG' | 'INVITATIONS' | 'RESET_PASSWORD' | 'USER_PROFILE';

export enum DisplayNamePreference {
    FullName = 'FullName',
    Initials = 'Initials',
    Anonymous = 'Anonymous',
}

export interface User {
    id: string;
    name: string;
    email: string;
    role: Role;
    avatarUrl: string;
    title?: string;
    department?: string;
    state?: string;
    bio?: string;
    profileCompletionPercentage?: number;
    expertiseLevel?: 'BEGINNER' | 'INTERMEDIATE' | 'EXPERT';
    expertiseAreas?: string[];
    discussionContributionScore?: number;
}

export enum ReactionType {
    HEART = 'HEART',
    SUPPORT = 'SUPPORT',
    LAUGH = 'LAUGH',
    SURPRISED = 'SURPRISED',
    ANGRY = 'ANGRY',
    SAD = 'SAD',
    FIRE = 'FIRE',
    CLAP = 'CLAP',
}

export interface Reaction {
    id: string;
    userId: string;
    postId: string;
    type: ReactionType;
}

export interface Comment {
    id: string;
    text: string;
    author: User;
    createdAt: string;
    parentCommentId?: string;
    replies?: Comment[];
    reactionCounts?: { [key: string]: number };
    depth?: number;
    replyCount?: number;
}

export interface Notification {
    id: string;
    userId: string;
    type: 'COMMENT_REPLY' | 'POST_REACTION' | 'MENTION' | 'EXPERT_RESPONSE';
    title: string;
    message: string;
    data: { [key: string]: any };
    isRead: boolean;
    createdAt: string;
}

export interface BroadcastMessage {
    id: string;
    title: string;
    message: string;
    imageUrl?: string;
    isActive: boolean;
    isVisible: boolean;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    creator?: User;
}

export interface Post {
    id: string;
    author: User;
    text: string;
    tags?: string[];
    displayName?: string;
    mediaUrl?: string;
    mediaType?: 'image' | 'video';
    createdAt: string;
    comments: Comment[];
    reactions: Reaction[];
}

export enum ResourceType {
    FILE = 'FILE',
    LINK = 'LINK',
}

export enum ContentStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    INACTIVE = 'INACTIVE',
}

export interface Resource {
    id: string;
    author: User;
    title: string;
    description?: string;
    type: ResourceType;
    content?: string; // For links
    file_url?: string; // For files
    status: ContentStatus;
    rejectionReason?: string;
    created_at: string;
}

export interface Blog {
    id: string;
    author: User;
    title: string;
    content: string;
    coverImageUrl?: string;
    status: ContentStatus;
    rejectionReason?: string;
    created_at: string;
}

export interface CreateResourceData {
    title: string;
    type: ResourceType;
    description?: string;
    content?: string; // for LINK
    file?: File; // for FILE
}

export interface CreateBlogData {
    title: string;
    content: string;
    coverImage?: File;
}

export interface Feedback {
    id: string;
    userId: string;
    content: string;
    rating: number;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    createdAt: string;
    updatedAt: string;
    author: User;
}

export type MessageSender = 'USER' | 'AI';

export interface ChatMessage {
    sender: MessageSender;
    text: string;
}

export type InvitationStatus = 'PENDING' | 'ACCEPTED';

export interface Invitation {
    id: string;
    invitee_email: string;
    status: InvitationStatus;
    created_at: string;
}

// --- CONVERSATION TYPES ---

export interface Conversation {
    id: string;
    title: string;
    description: string;
    createdBy: string;
    createdByName: string;
    createdByAvatar: string;
    status: 'ACTIVE' | 'INACTIVE';
    createdAt: string;
    updatedAt: string;
    messageCount: number;
    lastMessageAt?: string;
}

export interface ConversationMessage {
    id: string;
    conversationId: string;
    userId: string;
    userName: string;
    userAvatar: string;
    message: string;
    createdAt: string;
    reactions: ConversationReaction[];
}

export interface ConversationReaction {
    id: string;
    messageId: string;
    userId: string;
    type: ReactionType;
    createdAt: string;
}