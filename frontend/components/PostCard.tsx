
import React, { useState, useEffect } from 'react';
import { Post, ReactionType, Role, Comment } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { toggleReaction as apiToggleReaction, addComment as apiAddComment, updatePost as apiUpdatePost, reactToComment as apiReactToComment, deletePost as apiDeletePost } from '../services/mockApi';
import CommentSection from './CommentSection';
import Spinner from './Spinner';

interface PostCardProps {
    post: Post;
    onUpdate: () => void;
    isSingleView?: boolean;
    onNavigateToPost?: (post: Post) => void;
    onTagClick?: (tag: string) => void;
}

const getRoleBadgeClasses = (role: Role) => {
    switch (role) {
        case Role.ADMIN:
            return 'bg-purple-200 text-purple-800';
        case Role.NURSE:
            return 'bg-green-200 text-green-800';
        case Role.PENDING:
            return 'bg-yellow-200 text-yellow-800';
        default:
            return 'bg-gray-200 text-gray-800';
    }
};


const PostCard: React.FC<PostCardProps> = ({ post, onUpdate, isSingleView = false, onNavigateToPost, onTagClick }) => {
    const { user } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [editedText, setEditedText] = useState(post.text);
    const [editedTags, setEditedTags] = useState(post.tags?.join(', ') || '');
    const [isSaving, setIsSaving] = useState(false);
    const [phiConfirmedOnEdit, setPhiConfirmedOnEdit] = useState(false);

    // Defensive check for reactions and comments which might be undefined, null, or not an array in API responses
    const [reactions, setReactions] = useState(Array.isArray(post.reactions) ? post.reactions : []);
    const [comments, setComments] = useState<Comment[]>(Array.isArray(post.comments) ? post.comments : []);

    // Update comments and reactions when post prop changes
    useEffect(() => {
        setComments(Array.isArray(post.comments) ? post.comments : []);
        setReactions(Array.isArray(post.reactions) ? post.reactions : []);
    }, [post.comments, post.reactions]);

    const handleReaction = async (type: ReactionType) => {
        if (!user || user.role === Role.PENDING) return;
        
        // Check if user already has this reaction
        const existingReaction = reactions.find(r => r.userId === user.id && r.type === type);
        
        // Optimistically update reactions
        setReactions(prev => {
            if (existingReaction) {
                // Remove existing reaction
                return prev.filter(r => !(r.userId === user.id && r.type === type));
            } else {
                // Add new reaction
                return [...prev, {
                    id: `temp-${Date.now()}`,
                    userId: user.id,
                    postId: post.id,
                    type: type
                }];
            }
        });
        
        try {
            await apiToggleReaction(post.id, type);
            // Don't call onUpdate() here as it overwrites optimistic updates
        } catch (error) {
            console.error("Failed to toggle reaction", error);
            // Revert optimistic update on error
            setReactions(prev => {
                if (existingReaction) {
                    // Re-add the reaction that was removed
                    return [...prev, existingReaction];
                } else {
                    // Remove the reaction that was added
                    return prev.filter(r => !(r.userId === user.id && r.type === type));
                }
            });
        }
    };

    const handleAddComment = async (text: string, parentCommentId?: string) => {
        if (!user || user.role === Role.PENDING) return;
        
        // Create optimistic comment
        const optimisticComment: Comment = {
            id: `temp-${Date.now()}`,
            text: text,
            author: user,
            createdAt: new Date().toISOString(),
            parentCommentId: parentCommentId,
            replies: [],
            reactionCounts: {},
            depth: 0,
            replyCount: 0
        };
        
        // Optimistically add comment to local state
        setComments(prev => {
            if (parentCommentId) {
                // Add as reply to parent comment
                return prev.map(comment => 
                    comment.id === parentCommentId 
                        ? { ...comment, replies: [...(comment.replies || []), optimisticComment] }
                        : comment
                );
            } else {
                // Add as top-level comment
                return [...prev, optimisticComment];
            }
        });
        
        try {
            const newComment = await apiAddComment(post.id, text, parentCommentId);
            
            // Replace optimistic comment with real one
            setComments(prev => {
                if (parentCommentId) {
                    return prev.map(comment => 
                        comment.id === parentCommentId 
                            ? { 
                                ...comment, 
                                replies: comment.replies?.map(reply => 
                                    reply.id === optimisticComment.id ? newComment : reply
                                ) || []
                            }
                            : comment
                    );
                } else {
                    return prev.map(comment => 
                        comment.id === optimisticComment.id ? newComment : comment
                    );
                }
            });
        } catch (error) {
            console.error("Failed to add comment", error);
            // Remove optimistic comment on error
            setComments(prev => {
                if (parentCommentId) {
                    return prev.map(comment => 
                        comment.id === parentCommentId 
                            ? { 
                                ...comment, 
                                replies: comment.replies?.filter(reply => reply.id !== optimisticComment.id) || []
                            }
                            : comment
                    );
                } else {
                    return prev.filter(comment => comment.id !== optimisticComment.id);
                }
            });
        }
    };

    const handleReactToComment = async (commentId: string, reactionType: string) => {
        if (!user || user.role === Role.PENDING) return;
        
        // Find the comment to check current state
        let currentComment: Comment | null = null;
        const findComment = (comment: Comment): Comment | null => {
            if (comment.id === commentId) return comment;
            if (comment.replies) {
                for (const reply of comment.replies) {
                    const found = findComment(reply);
                    if (found) return found;
                }
            }
            return null;
        };
        
        for (const comment of comments) {
            currentComment = findComment(comment);
            if (currentComment) break;
        }
        
        if (!currentComment) return;
        
        // Check if user already has this reaction
        const currentCount = currentComment.reactionCounts?.[reactionType] || 0;
        const hasReaction = currentCount > 0; // Simple check - if count > 0, assume user has reacted
        
        // Toggle the reaction count
        const newCount = hasReaction ? Math.max(0, currentCount - 1) : currentCount + 1;
        
        // Optimistically update reaction counts
        setComments(prev => {
            const updateCommentReactions = (comment: Comment): Comment => {
                if (comment.id === commentId) {
                    return {
                        ...comment,
                        reactionCounts: {
                            ...comment.reactionCounts,
                            [reactionType]: newCount
                        }
                    };
                }
                if (comment.replies) {
                    return {
                        ...comment,
                        replies: comment.replies.map(updateCommentReactions)
                    };
                }
                return comment;
            };
            
            return prev.map(updateCommentReactions);
        });
        
        try {
            await apiReactToComment(commentId, reactionType);
            // Don't call onUpdate() here as it overwrites optimistic updates
        } catch (error) {
            console.error("Failed to react to comment", error);
            // Revert optimistic update on error
            setComments(prev => {
                const revertCommentReactions = (comment: Comment): Comment => {
                    if (comment.id === commentId) {
                        return {
                            ...comment,
                            reactionCounts: {
                                ...comment.reactionCounts,
                                [reactionType]: currentCount
                            }
                        };
                    }
                    if (comment.replies) {
                        return {
                            ...comment,
                            replies: comment.replies.map(revertCommentReactions)
                        };
                    }
                    return comment;
                };
                
                return prev.map(revertCommentReactions);
            });
        }
    };

    const handleSaveEdit = async () => {
        const textChanged = editedText.trim() !== post.text;
        const tagsChanged = editedTags !== (post.tags?.join(', ') || '');

        if ((!textChanged && !tagsChanged) || !phiConfirmedOnEdit) {
            setIsEditing(false);
            return;
        }

        setIsSaving(true);
        try {
            const tagsArray = editedTags.split(',').map(t => t.trim()).filter(Boolean);
            await apiUpdatePost(post.id, editedText.trim(), tagsArray);
            onUpdate(); // This refreshes the data from the parent
        } catch (error) {
            console.error("Failed to update post", error);
            // Revert changes on failure
            setEditedText(post.text);
            setEditedTags(post.tags?.join(', ') || '');
        } finally {
            setIsSaving(false);
            setIsEditing(false);
        }
    };

    const handleCancelEdit = () => {
        setEditedText(post.text);
        setEditedTags(post.tags?.join(', ') || '');
        setIsEditing(false);
        setPhiConfirmedOnEdit(false);
    };

    const handleDeletePost = async () => {
        try {
            await apiDeletePost(post.id);
            onUpdate(); // Refresh the parent component
        } catch (error) {
            console.error("Failed to delete post", error);
            alert("Failed to delete post. Please try again.");
        }
    };

    const userHasReacted = (type: ReactionType) => user && reactions.some(r => r.userId === user.id && r.type === type);
    const countReactions = (type: ReactionType) => reactions.filter(r => r.type === type).length;

    const heartsCount = countReactions(ReactionType.HEART);
    const supportCount = countReactions(ReactionType.SUPPORT);
    const laughCount = countReactions(ReactionType.LAUGH);
    const surprisedCount = countReactions(ReactionType.SURPRISED);
    const angryCount = countReactions(ReactionType.ANGRY);
    const sadCount = countReactions(ReactionType.SAD);
    const fireCount = countReactions(ReactionType.FIRE);
    const clapCount = countReactions(ReactionType.CLAP);

    const canInteract = user && user.role !== Role.PENDING;
    const isAuthor = user && user.id === post.author.id;

    const displayName = post.displayName || post.author.name;
    const isAnonymous = post.displayName === 'Anonymous';

    const AvatarDisplay = () => {
        if (isAnonymous) {
            return (
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center mr-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                </div>
            )
        }
        return <img src={post.author.avatarUrl || "/avatar.jpg"} alt={post.author.name} className="w-12 h-12 rounded-full object-cover mr-4" />;
    };

    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-4">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                        <AvatarDisplay />
                        <div>
                             <div className="flex items-center space-x-2">
                                <p className="font-bold text-gray-800">{displayName}</p>
                                {!isAnonymous && (
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getRoleBadgeClasses(post.author.role)}`}>
                                        {post.author.role}
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-gray-500">{new Date(post.createdAt).toLocaleString()}</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-1">
                        {isAuthor && !isEditing && (
                            <>
                                <button
                                    onClick={() => {
                                        setIsEditing(true);
                                        setPhiConfirmedOnEdit(false);
                                    }}
                                    className="text-gray-500 hover:text-blue-600 p-1 rounded-full transition-colors"
                                    aria-label="Edit post"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>
                                </button>
                                <button
                                    onClick={() => {
                                        if (window.confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
                                            handleDeletePost();
                                        }
                                    }}
                                    className="text-gray-500 hover:text-red-600 p-1 rounded-full transition-colors"
                                    aria-label="Delete post"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </>
                        )}
                        {!isSingleView && onNavigateToPost && (
                            <button 
                                onClick={() => onNavigateToPost(post)} 
                                className="text-gray-500 hover:text-teal-600 p-1 rounded-full transition-colors"
                                aria-label="View post details"
                            >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            </button>
                        )}
                    </div>
                </div>
                {isEditing ? (
                    <div className="mb-4">
                        <textarea
                            value={editedText}
                            onChange={(e) => setEditedText(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-400 resize-y"
                            rows={Math.max(4, editedText.split('\n').length)}
                            autoFocus
                        />
                         <input
                            type="text"
                            value={editedTags}
                            onChange={(e) => setEditedTags(e.target.value)}
                            placeholder="Edit tags (e.g., cardiology, pediatrics)..."
                            className="w-full p-2 mt-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-400 text-sm"
                        />
                        <div className="mt-4 flex items-start space-x-3 bg-yellow-50 p-3 rounded-md border border-yellow-200">
                            <input
                                id={`phi_confirm_edit_${post.id}`}
                                name="phi_confirm_edit"
                                type="checkbox"
                                checked={phiConfirmedOnEdit}
                                onChange={(e) => setPhiConfirmedOnEdit(e.target.checked)}
                                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded mt-1"
                            />
                            <div className="text-sm">
                                <label htmlFor={`phi_confirm_edit_${post.id}`} className="font-medium text-gray-800 cursor-pointer">
                                    I confirm I have removed patient identification information (PHI).
                                </label>
                                <p className="text-yellow-800">
                                    Please double-check your post for any patient identifiers before saving.
                                </p>
                            </div>
                        </div>
                        <div className="flex justify-end space-x-2 mt-4">
                            <button onClick={handleCancelEdit} className="px-4 py-1 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
                                Cancel
                            </button>
                            <button onClick={handleSaveEdit} disabled={isSaving || !phiConfirmedOnEdit || (editedText.trim() === post.text && editedTags === (post.tags?.join(', ') || ''))} className="px-4 py-1 bg-teal-500 text-white rounded-md hover:bg-teal-600 disabled:bg-teal-300 disabled:cursor-not-allowed flex items-center justify-center w-20">
                                {isSaving ? <Spinner /> : 'Save'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <p className="text-gray-700 mb-4 whitespace-pre-wrap">{post.text}</p>
                )}
                
                {!isEditing && Array.isArray(post.tags) && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                        {post.tags.map(tag => (
                            <button
                                key={tag}
                                onClick={onTagClick ? () => onTagClick(tag) : undefined}
                                className={`text-xs font-medium px-2.5 py-1 rounded-full ${onTagClick ? 'bg-teal-100 text-teal-800 hover:bg-teal-200 cursor-pointer' : 'bg-gray-100 text-gray-800'}`}
                            >
                                #{tag}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            {post.mediaUrl && (
                <div className="bg-gray-100">
                   {post.mediaType === 'image' ? (
                        <img src={post.mediaUrl} alt="Post media" className="w-full object-contain max-h-96" />
                   ) : (
                        <video src={post.mediaUrl} controls className="w-full object-contain max-h-96"></video>
                   )}
                </div>
            )}
            <div className="p-4">
                 {(heartsCount > 0 || supportCount > 0 || laughCount > 0 || surprisedCount > 0 || angryCount > 0 || sadCount > 0 || fireCount > 0 || clapCount > 0) && (
                    <div className="text-sm text-gray-600 pb-2 flex flex-wrap items-center gap-2">
                        {heartsCount > 0 && <span className="flex items-center gap-1">❤️ {heartsCount}</span>}
                        {supportCount > 0 && <span className="flex items-center gap-1">🤝 {supportCount}</span>}
                        {laughCount > 0 && <span className="flex items-center gap-1">😂 {laughCount}</span>}
                        {surprisedCount > 0 && <span className="flex items-center gap-1">😮 {surprisedCount}</span>}
                        {angryCount > 0 && <span className="flex items-center gap-1">😠 {angryCount}</span>}
                        {sadCount > 0 && <span className="flex items-center gap-1">😢 {sadCount}</span>}
                        {fireCount > 0 && <span className="flex items-center gap-1">🔥 {fireCount}</span>}
                        {clapCount > 0 && <span className="flex items-center gap-1">👏 {clapCount}</span>}
                    </div>
                )}
                <div className="border-t border-gray-200 py-3">
                    {/* Reaction buttons in a grid layout */}
                    <div className="grid grid-cols-4 gap-2 mb-2">
                        <button
                            onClick={() => handleReaction(ReactionType.HEART)}
                            disabled={!canInteract}
                            className={`flex flex-col items-center space-y-1 text-gray-600 hover:text-red-500 transition-colors rounded-lg p-2 disabled:cursor-not-allowed disabled:text-gray-400 ${userHasReacted(ReactionType.HEART) ? 'text-red-500 font-semibold bg-red-50' : 'hover:bg-gray-50'}`}
                        >
                            <span className="text-xl">❤️</span>
                            <span className="text-xs">Heart</span>
                        </button>
                        <button
                            onClick={() => handleReaction(ReactionType.SUPPORT)}
                            disabled={!canInteract}
                            className={`flex flex-col items-center space-y-1 text-gray-600 hover:text-blue-500 transition-colors rounded-lg p-2 disabled:cursor-not-allowed disabled:text-gray-400 ${userHasReacted(ReactionType.SUPPORT) ? 'text-blue-500 font-semibold bg-blue-50' : 'hover:bg-gray-50'}`}
                        >
                            <span className="text-xl">🤝</span>
                            <span className="text-xs">Support</span>
                        </button>
                        <button
                            onClick={() => handleReaction(ReactionType.LAUGH)}
                            disabled={!canInteract}
                            className={`flex flex-col items-center space-y-1 text-gray-600 hover:text-yellow-500 transition-colors rounded-lg p-2 disabled:cursor-not-allowed disabled:text-gray-400 ${userHasReacted(ReactionType.LAUGH) ? 'text-yellow-500 font-semibold bg-yellow-50' : 'hover:bg-gray-50'}`}
                        >
                            <span className="text-xl">😂</span>
                            <span className="text-xs">Laugh</span>
                        </button>
                        <button
                            onClick={() => handleReaction(ReactionType.SURPRISED)}
                            disabled={!canInteract}
                            className={`flex flex-col items-center space-y-1 text-gray-600 hover:text-orange-500 transition-colors rounded-lg p-2 disabled:cursor-not-allowed disabled:text-gray-400 ${userHasReacted(ReactionType.SURPRISED) ? 'text-orange-500 font-semibold bg-orange-50' : 'hover:bg-gray-50'}`}
                        >
                            <span className="text-xl">😮</span>
                            <span className="text-xs">Surprised</span>
                        </button>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                        <button
                            onClick={() => handleReaction(ReactionType.ANGRY)}
                            disabled={!canInteract}
                            className={`flex flex-col items-center space-y-1 text-gray-600 hover:text-red-600 transition-colors rounded-lg p-2 disabled:cursor-not-allowed disabled:text-gray-400 ${userHasReacted(ReactionType.ANGRY) ? 'text-red-600 font-semibold bg-red-50' : 'hover:bg-gray-50'}`}
                        >
                            <span className="text-xl">😠</span>
                            <span className="text-xs">Angry</span>
                        </button>
                        <button
                            onClick={() => handleReaction(ReactionType.SAD)}
                            disabled={!canInteract}
                            className={`flex flex-col items-center space-y-1 text-gray-600 hover:text-blue-600 transition-colors rounded-lg p-2 disabled:cursor-not-allowed disabled:text-gray-400 ${userHasReacted(ReactionType.SAD) ? 'text-blue-600 font-semibold bg-blue-50' : 'hover:bg-gray-50'}`}
                        >
                            <span className="text-xl">😢</span>
                            <span className="text-xs">Sad</span>
                        </button>
                        <button
                            onClick={() => handleReaction(ReactionType.FIRE)}
                            disabled={!canInteract}
                            className={`flex flex-col items-center space-y-1 text-gray-600 hover:text-orange-600 transition-colors rounded-lg p-2 disabled:cursor-not-allowed disabled:text-gray-400 ${userHasReacted(ReactionType.FIRE) ? 'text-orange-600 font-semibold bg-orange-50' : 'hover:bg-gray-50'}`}
                        >
                            <span className="text-xl">🔥</span>
                            <span className="text-xs">Fire</span>
                        </button>
                        <button
                            onClick={() => handleReaction(ReactionType.CLAP)}
                            disabled={!canInteract}
                            className={`flex flex-col items-center space-y-1 text-gray-600 hover:text-green-500 transition-colors rounded-lg p-2 disabled:cursor-not-allowed disabled:text-gray-400 ${userHasReacted(ReactionType.CLAP) ? 'text-green-500 font-semibold bg-green-50' : 'hover:bg-gray-50'}`}
                        >
                            <span className="text-xl">👏</span>
                            <span className="text-xs">Clap</span>
                        </button>
                    </div>
                </div>
                <CommentSection 
                    comments={comments} 
                    onAddComment={handleAddComment}
                    onReactToComment={handleReactToComment}
                />
            </div>
        </div>
    );
};

export default PostCard;
