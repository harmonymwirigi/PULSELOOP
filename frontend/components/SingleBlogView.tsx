import React from 'react';
import { Blog, View } from '../types';

interface SingleBlogViewProps {
    blog: Blog;
    navigateTo: (view: 'BLOGS') => void;
}

const DEFAULT_BLOG_COVER_IMAGE = '/blog.jpg';

// Helper function to safely format dates
const formatDate = (dateString: string | undefined | null): string => {
    if (!dateString) return 'Date not available';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid date';
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (error) {
        return 'Date not available';
    }
};

const SingleBlogView: React.FC<SingleBlogViewProps> = ({ blog, navigateTo }) => {
    return (
        <div className="max-w-4xl mx-auto py-8">
            <button 
                onClick={() => navigateTo('BLOGS')} 
                className="mb-8 flex items-center text-teal-600 hover:text-teal-800 font-medium transition-colors"
            >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to All Blogs
            </button>

            <article className="bg-white p-6 sm:p-8 rounded-lg shadow-lg">
                <header className="mb-8 border-b pb-6">
                    <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight mb-4">{blog.title}</h1>
                    <div className="flex items-center text-gray-500">
                        <img 
                            src={blog.author.avatarUrl || "/avatar.jpg"} 
                            alt={blog.author.name} 
                            className="w-12 h-12 rounded-full object-cover mr-4 border-2 border-teal-100"
                        />
                        <div>
                            <p className="font-semibold text-gray-800">{blog.author.name}</p>
                            <p className="text-sm">{formatDate(blog.created_at)}</p>
                        </div>
                    </div>
                </header>

                <div className="mb-8 rounded-lg overflow-hidden shadow-md">
                    <img 
                        src={blog.coverImageUrl || DEFAULT_BLOG_COVER_IMAGE} 
                        alt={blog.title} 
                        className="w-full h-auto object-cover"
                    />
                </div>

                 <div 
                    className="text-lg leading-relaxed space-y-6 text-gray-800 blog-content"
                    dangerouslySetInnerHTML={{ __html: blog.content }}
                />
            </article>
            
            <style>{`
                .blog-content p {
                    margin-bottom: 1.25rem;
                }
                .blog-content ul {
                    list-style-type: disc;
                    padding-left: 2rem;
                    margin-bottom: 1.25rem;
                }
                .blog-content strong {
                    font-weight: 700;
                }
                .blog-content em {
                    font-style: italic;
                }
            `}</style>
        </div>
    );
};

export default SingleBlogView;