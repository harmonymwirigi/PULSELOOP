import React, { useState, useEffect } from 'react';
import { Conversation, ConversationMessage, ReactionType } from '../types';
import { getConversations, createConversation, updateConversation, deleteConversation, getConversationMessages, createConversationMessage, addConversationReaction, removeConversationReaction } from '../services/mockApi';

interface MobileConversationsProps {
    isAdmin: boolean;
}

const MobileConversations: React.FC<MobileConversationsProps> = ({ isAdmin }) => {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<ConversationMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createForm, setCreateForm] = useState({ title: '', description: '' });

    useEffect(() => {
        fetchConversations();
    }, []);

    useEffect(() => {
        if (selectedConversation) {
            fetchMessages(selectedConversation.id);
        }
    }, [selectedConversation]);

    const fetchConversations = async () => {
        try {
            setLoading(true);
            const data = await getConversations();
            setConversations(data);
        } catch (error) {
            console.error('Failed to fetch conversations:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMessages = async (conversationId: string) => {
        try {
            const data = await getConversationMessages(conversationId);
            setMessages(data);
        } catch (error) {
            console.error('Failed to fetch messages:', error);
        }
    };

    const handleCreateConversation = async () => {
        if (!createForm.title.trim() || !createForm.description.trim()) return;

        try {
            const conversation = await createConversation(createForm.title.trim(), createForm.description.trim());
            setConversations(prev => [conversation, ...prev]);
            setCreateForm({ title: '', description: '' });
            setShowCreateModal(false);
        } catch (error) {
            console.error('Failed to create conversation:', error);
        }
    };

    const handleToggleConversation = async (conversationId: string, currentStatus: string) => {
        try {
            const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
            await updateConversation(conversationId, newStatus as 'ACTIVE' | 'INACTIVE');
            setConversations(prev => prev.map(conv => 
                conv.id === conversationId ? { ...conv, status: newStatus as 'ACTIVE' | 'INACTIVE' } : conv
            ));
        } catch (error) {
            console.error('Failed to toggle conversation:', error);
        }
    };

    const handleDeleteConversation = async (conversationId: string) => {
        if (!window.confirm('Are you sure you want to delete this conversation?')) return;

        try {
            await deleteConversation(conversationId);
            setConversations(prev => prev.filter(conv => conv.id !== conversationId));
            if (selectedConversation?.id === conversationId) {
                setSelectedConversation(null);
                setMessages([]);
            }
        } catch (error) {
            console.error('Failed to delete conversation:', error);
        }
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !selectedConversation) return;

        try {
            const message = await createConversationMessage(selectedConversation.id, newMessage.trim());
            setMessages(prev => [...prev, message]);
            setNewMessage('');
        } catch (error) {
            console.error('Failed to send message:', error);
        }
    };

    const handleAddReaction = async (messageId: string, type: ReactionType) => {
        try {
            const reaction = await addConversationReaction(messageId, type);
            setMessages(prev => prev.map(msg => 
                msg.id === messageId 
                    ? { ...msg, reactions: [...msg.reactions, reaction] }
                    : msg
            ));
        } catch (error) {
            console.error('Failed to add reaction:', error);
        }
    };

    const handleRemoveReaction = async (messageId: string, reactionId: string) => {
        try {
            await removeConversationReaction(messageId, reactionId);
            setMessages(prev => prev.map(msg => 
                msg.id === messageId 
                    ? { ...msg, reactions: msg.reactions.filter(r => r.id !== reactionId) }
                    : msg
            ));
        } catch (error) {
            console.error('Failed to remove reaction:', error);
        }
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
        
        if (diffInHours < 1) {
            const diffInMinutes = Math.floor(diffInHours * 60);
            return `${diffInMinutes}m ago`;
        } else if (diffInHours < 24) {
            return `${Math.floor(diffInHours)}h ago`;
        } else {
            return date.toLocaleDateString();
        }
    };

    if (loading) {
        return (
            <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-xl shadow-lg border border-white/20 dark:border-gray-700/20 p-4">
                <div className="animate-pulse">
                    <div className="h-5 bg-gray-200 rounded mb-3"></div>
                    <div className="space-y-2">
                        <div className="h-3 bg-gray-200 rounded"></div>
                        <div className="h-3 bg-gray-200 rounded"></div>
                        <div className="h-3 bg-gray-200 rounded"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-xl shadow-lg border border-white/20 dark:border-gray-700/20">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">Discussions</h3>
                    {isAdmin && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                            Start
                        </button>
                    )}
                </div>
            </div>

            {/* Conversations List */}
            <div className="max-h-80 overflow-y-auto">
                {conversations.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                        <p className="text-sm">No active discussions yet.</p>
                        {isAdmin && (
                            <p className="text-xs mt-1">Start a discussion to get the conversation going!</p>
                        )}
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {conversations.map((conversation) => (
                            <div
                                key={conversation.id}
                                className={`p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                                    selectedConversation?.id === conversation.id ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
                                }`}
                                onClick={() => setSelectedConversation(conversation)}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                            {conversation.title}
                                        </h4>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                                            {conversation.description}
                                        </p>
                                        <div className="flex items-center mt-1 space-x-3 text-xs text-gray-400">
                                            <span>{conversation.messageCount} msgs</span>
                                            <span>{formatTime(conversation.createdAt)}</span>
                                        </div>
                                    </div>
                                    {isAdmin && (
                                        <div className="flex items-center space-x-1 ml-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleToggleConversation(conversation.id, conversation.status);
                                                }}
                                                className={`px-2 py-1 text-xs rounded ${
                                                    conversation.status === 'ACTIVE'
                                                        ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                                                }`}
                                            >
                                                {conversation.status === 'ACTIVE' ? 'On' : 'Off'}
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteConversation(conversation.id);
                                                }}
                                                className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Messages Section */}
            {selectedConversation && (
                <div className="border-t border-gray-200 dark:border-gray-700">
                    <div className="p-3 bg-gray-50 dark:bg-gray-700/50">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                            {selectedConversation.title}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {selectedConversation.description}
                        </p>
                    </div>
                    
                    {/* Messages */}
                    <div className="max-h-48 overflow-y-auto p-3 space-y-2">
                        {messages.map((message) => (
                            <div key={message.id} className="flex items-start space-x-2">
                                <img
                                    src={message.userAvatar || '/avatar.jpg'}
                                    alt={message.userName}
                                    className="w-5 h-5 rounded-full"
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-2">
                                        <span className="text-xs font-medium text-gray-900 dark:text-white">
                                            {message.userName}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            {formatTime(message.createdAt)}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-700 dark:text-gray-300 mt-1">
                                        {message.message}
                                    </p>
                                    
                                    {/* Reactions */}
                                    <div className="flex items-center space-x-1 mt-1">
                                        {message.reactions.map((reaction) => (
                                            <button
                                                key={reaction.id}
                                                onClick={() => handleRemoveReaction(message.id, reaction.id)}
                                                className="flex items-center space-x-1 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-600 rounded-full text-xs hover:bg-gray-200 dark:hover:bg-gray-500"
                                            >
                                                <span>{reaction.type === 'HEART' ? '❤️' : reaction.type === 'SUPPORT' ? '👍' : '😂'}</span>
                                            </button>
                                        ))}
                                        <div className="flex items-center space-x-1">
                                            <button
                                                onClick={() => handleAddReaction(message.id, ReactionType.HEART)}
                                                className="text-xs text-gray-400 hover:text-red-500"
                                            >
                                                ❤️
                                            </button>
                                            <button
                                                onClick={() => handleAddReaction(message.id, ReactionType.SUPPORT)}
                                                className="text-xs text-gray-400 hover:text-blue-500"
                                            >
                                                👍
                                            </button>
                                            <button
                                                onClick={() => handleAddReaction(message.id, ReactionType.LAUGH)}
                                                className="text-xs text-gray-400 hover:text-yellow-500"
                                            >
                                                😂
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    {/* Message Input */}
                    <div className="p-3 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex space-x-2">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Type your message..."
                                className="flex-1 px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={!newMessage.trim()}
                                className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Send
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Conversation Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 w-full max-w-sm">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
                            Start New Discussion
                        </h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Title
                                </label>
                                <input
                                    type="text"
                                    value={createForm.title}
                                    onChange={(e) => setCreateForm(prev => ({ ...prev, title: e.target.value }))}
                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                    placeholder="Discussion title..."
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Description
                                </label>
                                <textarea
                                    value={createForm.description}
                                    onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                    placeholder="What would you like to discuss?"
                                    rows={2}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end space-x-2 mt-4">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateConversation}
                                disabled={!createForm.title.trim() || !createForm.description.trim()}
                                className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Start
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MobileConversations;