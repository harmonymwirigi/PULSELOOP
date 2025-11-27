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
    onCreatePostClick?: () => void;
}

const POSTS_PER_PAGE = 5;

const Feed: React.FC<FeedProps> = ({ navigateToPost, initialTagFilter, onTagFilterChange, onSearchResult, onCreatePostClick }) => {
    const { user } = useAuth();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filterTag, setFilterTag] = useState<string | null>(initialTagFilter || null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPosts, setTotalPosts] = useState(0);
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [currentPromotionIndex, setCurrentPromotionIndex] = useState<number | null>(null);
    const [isPromotionVisible, setIsPromotionVisible] = useState(false);

    const totalPages = Math.ceil(totalPosts / POSTS_PER_PAGE) || 1;

    const fetchPosts = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await getPosts(currentPage, POSTS_PER_PAGE, filterTag || undefined);
            // Ensure that we have an array of posts, even if API response is malformed.
            const rawPosts = Array.isArray(response?.posts) ? response.posts : [];
            // Hide story posts from the main feed so stories can live under their own section.
            const nonStoryPosts = rawPosts.filter(post => !post.isStory);
            setPosts(nonStoryPosts);
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
                console.error('Failed to load promotions for feed', e);
            }
        };
        loadPromotions();
    }, []);

    // Handle rotating promotions in a single dedicated container.
    // Behaviour:
    // - If there are no promotions, the container is hidden.
    // - If there is one promotion, it will show, fade out briefly, then reappear after a delay.
    // - If there are multiple promotions, they will show one at a time, picked randomly.
    useEffect(() => {
        if (!promotions || promotions.length === 0) {
            setCurrentPromotionIndex(null);
            setIsPromotionVisible(false);
            return;
        }

        const DISPLAY_DURATION = 8000; // ms the promotion stays fully visible
        const FADE_DURATION = 500;     // ms for a simple fade out / in
        const GAP_DURATION = 1000;     // ms with container hidden between promotions

        let displayTimeout: number | undefined;
        let fadeTimeout: number | undefined;
        let gapTimeout: number | undefined;

        const chooseNextIndex = (currentIndex: number | null): number => {
            if (promotions.length === 1) {
                return 0;
            }
            // Randomly pick a different index than the current one
            let next = currentIndex ?? 0;
            while (next === currentIndex) {
                next = Math.floor(Math.random() * promotions.length);
            }
            return next;
        };

        const startCycle = (fromIndex: number | null) => {
            const nextIndex = chooseNextIndex(fromIndex);
            setCurrentPromotionIndex(nextIndex);
            setIsPromotionVisible(true);

            // After visible duration, trigger fade out
            displayTimeout = window.setTimeout(() => {
                setIsPromotionVisible(false);

                // Wait for fade, then wait for small gap, then show another promotion
                fadeTimeout = window.setTimeout(() => {
                    gapTimeout = window.setTimeout(() => {
                        startCycle(nextIndex);
                    }, GAP_DURATION);
                }, FADE_DURATION);
            }, DISPLAY_DURATION);
        };

        // Kick off the cycle using current index (if any) to avoid repeat
        startCycle(currentPromotionIndex);

        return () => {
            if (displayTimeout) window.clearTimeout(displayTimeout);
            if (fadeTimeout) window.clearTimeout(fadeTimeout);
            if (gapTimeout) window.clearTimeout(gapTimeout);
        };
        // We intentionally do NOT include currentPromotionIndex in deps
        // to avoid restarting the cycle on every state update.
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
            {/* Create Post button (top-right) */}
            {user && (user.role === Role.NURSE || user.role === Role.ADMIN) && (
                <div className="mb-4 flex justify-end">
                    <button
                        type="button"
                        onClick={() => {
                            if (onCreatePostClick) {
                                onCreatePostClick();
                            }
                        }}
                        className="px-6 py-2 rounded-full bg-teal-500 text-white font-semibold shadow hover:bg-teal-600 transition-colors"
                    >
                        Create a post
                    </button>
                </div>
            )}

            {/* Promotion container: shows one promotion at a fixed position, if any approved promotions exist */}
            {promotions.length > 0 && currentPromotionIndex !== null && (
                <div
                    className={`mb-6 sticky top-4 z-20 transition-opacity duration-500 ${
                        isPromotionVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                >
                    {(() => {
                        const promo = promotions[currentPromotionIndex];
                        if (!promo) return null;
                        return (
                            <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 rounded-2xl p-4 sm:p-5 text-white shadow-md">
                                <a
                                    href={promo.targetUrl || '#'}
                                    target={promo.targetUrl ? '_blank' : undefined}
                                    rel={promo.targetUrl ? 'noopener noreferrer' : undefined}
                                    className="group flex flex-col sm:flex-row gap-3 sm:gap-4 cursor-pointer"
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
                                        <p className="text-xs uppercase tracking-wide text-indigo-100/80 font-semibold">
                                            Sponsored
                                        </p>
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
                            </div>
                        );
                    })()}
                </div>
            )}

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

            <div className="space-y-6">
                {posts.map(post => (
                    <PostCard
                        key={post.id}
                        post={post}
                        onUpdate={fetchPosts}
                        onNavigateToPost={navigateToPost}
                        onTagClick={handleTagClick}
                    />
                ))}
            </div>
        </div>
    );
};

export default Feed;