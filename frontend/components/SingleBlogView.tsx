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
                .blog-content {
                    line-height: 1.8;
                }
                .blog-content p {
                    margin-bottom: 1.5rem;
                }
                .blog-content h1, .blog-content h2, .blog-content h3, .blog-content h4, .blog-content h5, .blog-content h6 {
                    font-weight: 700;
                    margin-top: 2rem;
                    margin-bottom: 1rem;
                    color: #1f2937;
                }
                .blog-content h1 { font-size: 2.25rem; }
                .blog-content h2 { font-size: 1.875rem; }
                .blog-content h3 { font-size: 1.5rem; }
                .blog-content h4 { font-size: 1.25rem; }
                .blog-content h5 { font-size: 1.125rem; }
                .blog-content h6 { font-size: 1rem; }
                .blog-content ul, .blog-content ol {
                    padding-left: 2rem;
                    margin-bottom: 1.5rem;
                }
                .blog-content ul {
                    list-style-type: disc;
                }
                .blog-content ol {
                    list-style-type: decimal;
                }
                .blog-content li {
                    margin-bottom: 0.5rem;
                }
                .blog-content blockquote {
                    border-left: 4px solid #14b8a6;
                    padding-left: 1.5rem;
                    margin: 2rem 0;
                    font-style: italic;
                    color: #6b7280;
                    background-color: #f9fafb;
                    padding: 1rem 1.5rem;
                    border-radius: 0.5rem;
                }
                .blog-content img {
                    max-width: 100%;
                    height: auto;
                    border-radius: 0.5rem;
                    margin: 1.5rem 0;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                }
                .blog-content video {
                    max-width: 100%;
                    height: auto;
                    border-radius: 0.5rem;
                    margin: 1.5rem 0;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                }
                .blog-content table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 1.5rem 0;
                    border-radius: 0.5rem;
                    overflow: hidden;
                    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
                }
                .blog-content th, .blog-content td {
                    border: 1px solid #e5e7eb;
                    padding: 0.75rem;
                    text-align: left;
                }
                .blog-content th {
                    background-color: #f9fafb;
                    font-weight: 600;
                }
                .blog-content code {
                    background-color: #f3f4f6;
                    padding: 0.25rem 0.5rem;
                    border-radius: 0.25rem;
                    font-family: 'Courier New', monospace;
                    font-size: 0.875rem;
                }
                .blog-content pre {
                    background-color: #1f2937;
                    color: #f9fafb;
                    padding: 1rem;
                    border-radius: 0.5rem;
                    overflow-x: auto;
                    margin: 1.5rem 0;
                }
                .blog-content pre code {
                    background-color: transparent;
                    padding: 0;
                    color: inherit;
                }
                .blog-content strong {
                    font-weight: 700;
                }
                .blog-content em {
                    font-style: italic;
                }
                .blog-content a {
                    color: #14b8a6;
                    text-decoration: underline;
                }
                .blog-content a:hover {
                    color: #0d9488;
                }
            `}</style>
        </div>
    );
};

export default SingleBlogView;