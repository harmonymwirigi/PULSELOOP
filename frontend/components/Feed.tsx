// frontend/components/Feed.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { getPosts, createPost as apiCreatePost, getPromotions } from '../services/mockApi';
import { Post, Role, DisplayNamePreference, Promotion } from '../types';
import { useAuth } from '../contexts/AuthContext';
import CreatePostForm from './CreatePostForm';
import PostCard from './PostCard';
import Spinner from './Spinner';
import SearchBar from './SearchBar';

interface FeedProps {
    navigateToPost: (post: Post) => void;
    initialTagFilter?: string | null;
    onTagFilterChange?: (tag: string | null) => void;
    onSearchResult?: (result: any) => void;
}

const POSTS_PER_PAGE = 5;

const Feed: React.FC<FeedProps> = ({ navigateToPost, initialTagFilter, onTagFilterChange, onSearchResult }) => {
    const { user } = useAuth();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filterTag, setFilterTag] = useState<string | null>(initialTagFilter || null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPosts, setTotalPosts] = useState(0);
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [activePromotionIndex, setActivePromotionIndex] = useState(0);

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

    useEffect(() => {
        const loadPromotions = async () => {
            try {
                const approved = await getPromotions('APPROVED');
                setPromotions(approved);
            } catch (e) {
                console.error('Failed to load promotions for feed header', e);
            }
        };
        loadPromotions();
    }, []);

    // Rotate promotions like Facebook-style ads
    useEffect(() => {
        if (!promotions || promotions.length <= 1) return;

        const interval = setInterval(() => {
            setActivePromotionIndex((prev) => (prev + 1) % promotions.length);
        }, 10000); // change every 10 seconds

        return () => clearInterval(interval);
    }, [promotions]);

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
            {/* Page Search */}
            {user && (
                <div className="mb-4">
                    <SearchBar
                        onResultClick={(result) => {
                            if (onSearchResult) {
                                onSearchResult(result);
                            }
                        }}
                        placeholder="Search feeds, resources, blogs, professionals..."
                    />
                </div>
            )}

            {/* Header Advertisements (replaces stats section) */}
            {user && promotions.length > 0 && (
                <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 rounded-2xl p-5 sm:p-6 mb-6 text-white shadow-xl">
                    <div className="max-w-md">
                        <h1 className="text-2xl font-extrabold mb-1">
                            Featured Advertisements
                        </h1>
                        <p className="text-indigo-100 text-sm">
                            Discover offers and services from businesses in the PulseLoopCare community.
                        </p>
                    </div>

                    {/* Rotating promotion card */}
                    <div className="mt-4 grid grid-cols-1 gap-4">
                        {promotions.map((promo, index) => {
                            if (index !== activePromotionIndex) return null;
                            return (
                            <a
                                key={promo.id}
                                href={promo.targetUrl || '#'}
                                target={promo.targetUrl ? '_blank' : undefined}
                                rel={promo.targetUrl ? 'noopener noreferrer' : undefined}
                                className="group bg-white/10 hover:bg-white/15 backdrop-blur-md rounded-xl border border-white/25 shadow-md hover:shadow-lg transition transform hover:-translate-y-0.5 flex flex-col sm:flex-row gap-3 sm:gap-4 p-4 cursor-pointer"
                            >
                                {promo.imageUrl && (
                                    <div className="w-full sm:w-32 md:w-40 h-32 sm:h-24 md:h-28 rounded-lg overflow-hidden bg-white flex-shrink-0 flex items-center justify-center">
                                        <img
                                            src={promo.imageUrl}
                                            alt={promo.title}
                                            className="max-w-full max-h-full object-contain"
                                        />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0 space-y-1">
                                    <p className="text-sm sm:text-base font-semibold leading-snug">
                                        {promo.title}
                                    </p>
                                    {promo.business?.businessName && (
                                        <p className="text-xs text-indigo-100/80">
                                            {promo.business.businessName}
                                        </p>
                                    )}
                                    {promo.description && (
                                        <p className="text-xs sm:text-sm text-indigo-100/90 whitespace-pre-wrap">
                                            {promo.description}
                                        </p>
                                    )}
                                    {promo.targetUrl && (
                                        <span className="inline-flex items-center mt-1 text-[11px] sm:text-xs text-yellow-100 group-hover:text-white font-semibold">
                                            Learn more
                                            <svg
                                                className="w-3 h-3 ml-1"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M9 5l7 7-7 7"
                                                />
                                            </svg>
                                        </span>
                                    )}
                                </div>
                            </a>
                            );
                        })}
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