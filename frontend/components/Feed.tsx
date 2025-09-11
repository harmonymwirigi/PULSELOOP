// frontend/components/Feed.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { getPosts, createPost as apiCreatePost } from '../services/mockApi';
import { Post, Role, DisplayNamePreference } from '../types';
import { useAuth } from '../contexts/AuthContext';
import CreatePostForm from './CreatePostForm';
import PostCard from './PostCard';
import Spinner from './Spinner';

interface FeedProps {
    navigateToPost: (post: Post) => void;
    initialTagFilter?: string | null;
    onTagFilterChange?: (tag: string | null) => void;
}

const POSTS_PER_PAGE = 5;

const Feed: React.FC<FeedProps> = ({ navigateToPost, initialTagFilter, onTagFilterChange }) => {
    const { user } = useAuth();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filterTag, setFilterTag] = useState<string | null>(initialTagFilter || null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPosts, setTotalPosts] = useState(0);

    const totalPages = Math.ceil(totalPosts / POSTS_PER_PAGE) || 1;

    const fetchPosts = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await getPosts(currentPage, POSTS_PER_PAGE, filterTag || undefined);
            // Ensure that we have an array of posts, even if API response is malformed.
            setPosts(Array.isArray(response?.posts) ? response.posts : []);
            setTotalPosts(response?.total || 0);
        } catch (err) {
            setError('Failed to fetch posts.');
            setPosts([]); // Ensure posts is an array on error
        } finally {
            setLoading(false);
        }
    }, [currentPage, filterTag]);

    // Add optimistic updates for better UX
    const handleOptimisticPost = useCallback((newPost: Post) => {
        setPosts(prevPosts => [newPost, ...prevPosts]);
        setTotalPosts(prev => prev + 1);
    }, []);

    useEffect(() => {
        fetchPosts();
    }, [fetchPosts]);

    // Handle initial tag filter changes from trending topics
    useEffect(() => {
        if (initialTagFilter !== filterTag) {
            setFilterTag(initialTagFilter);
            setCurrentPage(1);
        }
    }, [initialTagFilter]);

    const handleCreatePost = async (text: string, mediaFile: File | null, displayNamePreference: DisplayNamePreference, tags: string[]) => {
        if (!user) return;
        try {
            await apiCreatePost(text, mediaFile, displayNamePreference, tags);
            // After creating a post, go back to the first page to see it.
            // If there's a filter, clearing it will trigger a refetch on page 1.
            if (filterTag) {
                setFilterTag(null);
                setCurrentPage(1);
            } else {
                // if not on page 1, go to page 1.
                if (currentPage !== 1) {
                    setCurrentPage(1);
                } else {
                    // if on page 1 with no filter, just refetch.
                    fetchPosts();
                }
            }
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('An unknown error occurred while creating the post.');
            }
        }
    };
    
    const handleTagClick = (tag: string) => {
        setFilterTag(tag);
        setCurrentPage(1);
        onTagFilterChange?.(tag);
    };

    const handleClearFilter = () => {
        setFilterTag(null);
        setCurrentPage(1);
        onTagFilterChange?.(null);
    };

    const handlePageChange = (newPage: number) => {
        if (newPage > 0 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    if (loading && posts.length === 0) {
        return <div className="flex justify-center mt-16"><Spinner size="lg" color="teal"/></div>;
    }

    if (error) {
        return <p className="text-center text-red-500 mt-8">{error}</p>;
    }

    return (
        <div>
            {/* Dashboard Header */}
            {user && (
                <div className="bg-gradient-to-r from-indigo-600 to-cyan-600 rounded-xl p-6 mb-6 text-white shadow-lg">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                        <div className="mb-4 md:mb-0">
                            <h1 className="text-2xl font-bold mb-2">
                                Welcome back, {user.name?.split(' ')[0] || 'there'}! 👋
                            </h1>
                            <p className="text-indigo-100">
                                {new Date().toLocaleDateString('en-US', { 
                                    weekday: 'long', 
                                    year: 'numeric', 
                                    month: 'long', 
                                    day: 'numeric' 
                                })}
                            </p>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
                                <div className="text-2xl font-bold">{totalPosts}</div>
                                <div className="text-sm text-indigo-100">Total Posts</div>
                            </div>
                            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
                                <div className="text-2xl font-bold">{posts.length}</div>
                                <div className="text-sm text-indigo-100">This Page</div>
                            </div>
                            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
                                <div className="text-2xl font-bold">{user.role}</div>
                                <div className="text-sm text-indigo-100">Your Role</div>
                            </div>
                            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
                                <div className="text-2xl font-bold">
                                    {user.profileCompletionPercentage || 0}%
                                </div>
                                <div className="text-sm text-indigo-100">Profile Complete</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {user && (user.role === Role.NURSE || user.role === Role.ADMIN) && <CreatePostForm onCreatePost={handleCreatePost} />}
            {user && user.role === Role.PENDING && (
                 <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-md mb-6" role="alert">
                    <p className="font-bold">Account Pending</p>
                    <p>Your account is awaiting admin approval. You can view posts, but you cannot post, comment, or react yet.</p>
                </div>
            )}
            {filterTag && (
                <div className="bg-teal-50 border-l-4 border-teal-500 text-teal-800 p-4 rounded-md mb-6 flex items-center justify-between">
                    <div>
                        <span className="font-semibold">Filtering by tag:</span>
                        <span className="inline-block bg-teal-200 text-teal-800 text-sm font-medium ml-2 px-2.5 py-0.5 rounded-full">{filterTag}</span>
                    </div>
                    <button onClick={handleClearFilter} className="font-semibold hover:underline">
                        Clear Filter
                    </button>
                </div>
            )}
            <div className="space-y-6">
                {posts.map(post => (
                    <PostCard key={post.id} post={post} onUpdate={fetchPosts} onNavigateToPost={navigateToPost} onTagClick={handleTagClick} />
                ))}
            </div>
            {totalPages > 1 && (
                <div className="flex justify-between items-center mt-8 p-4 bg-white rounded-lg shadow-md">
                    <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1 || loading}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed font-semibold"
                    >
                        &larr; Previous
                    </button>
                    <span className="text-gray-700 font-medium">
                        Page {currentPage} of {totalPages}
                    </span>
                    <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages || loading}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed font-semibold"
                    >
                        Next &rarr;
                    </button>
                </div>
            )}
        </div>
    );
};

export default Feed;