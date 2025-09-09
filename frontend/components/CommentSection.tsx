
import React, { useState } from 'react';
import { Comment, Role } from '../types';
import { useAuth } from '../contexts/AuthContext';
import Spinner from './Spinner';

interface CommentSectionProps {
    comments: Comment[];
    onAddComment: (text: string, parentCommentId?: string) => Promise<void>;
    onReactToComment?: (commentId: string, reactionType: string) => Promise<void>;
}

interface EnhancedComment extends Comment {
    replies?: EnhancedComment[];
    reactionCounts?: { [key: string]: number };
    depth?: number;
    replyCount?: number;
}

const CommentSection: React.FC<CommentSectionProps> = ({ 
    comments, 
    onAddComment, 
    onReactToComment 
}) => {
    const { user } = useAuth();
    const [newComment, setNewComment] = useState('');
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyText, setReplyText] = useState('');
    const [loading, setLoading] = useState(false);
    const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || !user || user.role === Role.PENDING) return;
        
        setLoading(true);
        await onAddComment(newComment);
        setNewComment('');
        setLoading(false);
    };

    const handleReplySubmit = async (e: React.FormEvent, parentCommentId: string) => {
        e.preventDefault();
        if (!replyText.trim() || !user || user.role === Role.PENDING) return;
        
        setLoading(true);
        await onAddComment(replyText, parentCommentId);
        setReplyText('');
        setReplyingTo(null);
        setLoading(false);
    };

    const handleReaction = async (commentId: string, reactionType: string) => {
        if (!user || user.role === Role.PENDING || !onReactToComment) return;
        await onReactToComment(commentId, reactionType);
    };

    const toggleExpanded = (commentId: string) => {
        const newExpanded = new Set(expandedComments);
        if (newExpanded.has(commentId)) {
            newExpanded.delete(commentId);
        } else {
            newExpanded.add(commentId);
        }
        setExpandedComments(newExpanded);
    };

    const canComment = user && user.role !== Role.PENDING;

    const renderComment = (comment: EnhancedComment, depth: number = 0) => {
        const isExpanded = expandedComments.has(comment.id);
        const hasReplies = comment.replies && comment.replies.length > 0;
        const maxDepth = 3; // Limit nesting depth

        return (
            <div key={comment.id} className={`${depth > 0 ? 'ml-8 border-l-2 border-gray-200 pl-4' : ''}`}>
                <div className="flex items-start space-x-3 mb-2">
                    <img 
                        src={comment.author.avatarUrl} 
                        alt={comment.author.name} 
                        className="w-8 h-8 rounded-full object-cover" 
                    />
                    <div className="flex-1">
                        <div className="bg-gray-50 rounded-lg p-3">
                            <div className="flex items-center space-x-2 mb-1">
                                <p className="font-semibold text-sm text-gray-800">{comment.author.name}</p>
                                {comment.author.expertiseLevel === 'EXPERT' && (
                                    <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-medium">
                                        Expert
                                    </span>
                                )}
                                <span className="text-xs text-gray-500">
                                    {new Date(comment.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                            <p className="text-sm text-gray-700 mb-2">{comment.text}</p>
                            
                            {/* Reaction buttons */}
                            <div className="flex items-center space-x-4">
                                <button
                                    onClick={() => handleReaction(comment.id, 'UPVOTE')}
                                    className="flex items-center space-x-1 text-xs text-gray-600 hover:text-green-600"
                                >
                                    <span>👍</span>
                                    <span>{comment.reactionCounts?.UPVOTE || 0}</span>
                                </button>
                                <button
                                    onClick={() => handleReaction(comment.id, 'HELPFUL')}
                                    className="flex items-center space-x-1 text-xs text-gray-600 hover:text-blue-600"
                                >
                                    <span>💡</span>
                                    <span>{comment.reactionCounts?.HELPFUL || 0}</span>
                                </button>
                                <button
                                    onClick={() => handleReaction(comment.id, 'EXPERT')}
                                    className="flex items-center space-x-1 text-xs text-gray-600 hover:text-purple-600"
                                >
                                    <span>⭐</span>
                                    <span>{comment.reactionCounts?.EXPERT || 0}</span>
                                </button>
                                
                                {canComment && depth < maxDepth && (
                                    <button
                                        onClick={() => setReplyingTo(comment.id)}
                                        className="text-xs text-teal-600 hover:text-teal-800"
                                    >
                                        Reply
                                    </button>
                                )}
                                
                                {hasReplies && (
                                    <button
                                        onClick={() => toggleExpanded(comment.id)}
                                        className="text-xs text-gray-600 hover:text-gray-800"
                                    >
                                        {isExpanded ? 'Hide' : 'Show'} {comment.replyCount} replies
                                    </button>
                                )}
                            </div>
                        </div>
                        
                        {/* Reply form */}
                        {replyingTo === comment.id && (
                            <form 
                                onSubmit={(e) => handleReplySubmit(e, comment.id)}
                                className="mt-2 flex items-center space-x-2"
                            >
                                <input
                                    type="text"
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    placeholder="Write a reply..."
                                    className="flex-1 px-3 py-2 text-sm border bg-white border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-teal-400"
                                />
                                <button 
                                    type="submit" 
                                    disabled={loading || !replyText.trim()} 
                                    className="px-3 py-1 bg-teal-500 text-white text-sm rounded-full hover:bg-teal-600 disabled:bg-teal-300"
                                >
                                    {loading ? <Spinner size="sm" /> : 'Reply'}
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => {
                                        setReplyingTo(null);
                                        setReplyText('');
                                    }}
                                    className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded-full hover:bg-gray-400"
                                >
                                    Cancel
                                </button>
                            </form>
                        )}
                    </div>
                </div>
                
                {/* Render replies */}
                {hasReplies && isExpanded && (
                    <div className="mt-2">
                        {comment.replies?.map(reply => renderComment(reply, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="mt-4">
            {canComment && (
                <form onSubmit={handleSubmit} className="flex items-center space-x-2 mb-6">
                    <img src={user?.avatarUrl || "/avatar.jpg"} alt={user?.name} className="w-9 h-9 rounded-full object-cover" />
                    <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Join the discussion..."
                        className="w-full px-4 py-2 border bg-gray-50 border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-teal-400"
                    />
                    <button 
                        type="submit" 
                        disabled={loading || !newComment.trim()} 
                        className="p-2 bg-teal-500 text-white rounded-full hover:bg-teal-600 disabled:bg-teal-300"
                    >
                        {loading ? <Spinner size="sm" /> : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        )}
                    </button>
                </form>
            )}

            <div className="space-y-4">
                {comments
                    .filter(comment => !comment.parentCommentId) // Only show top-level comments
                    .map(comment => renderComment(comment as EnhancedComment))
                }
            </div>
        </div>
    );
};

export default CommentSection;
