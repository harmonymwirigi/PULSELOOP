import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getBlogs, createBlog } from '../services/mockApi';
import { Blog, CreateBlogData } from '../types';
import { useAuth } from '../contexts/AuthContext';
import Spinner from './Spinner';
import RichTextEditor from './RichTextEditor';

interface BlogsProps {
    navigateToBlog: (blog: Blog) => void;
}

const DEFAULT_BLOG_COVER_IMAGE = '/blog.jpg';

// Helper function to safely format dates
const formatDate = (dateString: string | undefined | null): string => {
    if (!dateString) return 'Date not available';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid date';
        return date.toLocaleDateString();
    } catch (error) {
        return 'Date not available';
    }
};

const Blogs: React.FC<BlogsProps> = ({ navigateToBlog }) => {
    const [blogs, setBlogs] = useState<Blog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);

    const fetchBlogs = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const fetchedBlogs = await getBlogs();
            setBlogs(fetchedBlogs);
        } catch (err) {
            setError('Failed to fetch blogs.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBlogs();
    }, [fetchBlogs]);

    const handleCreateBlog = async (data: CreateBlogData) => {
        try {
            await createBlog(data);
            setShowForm(false);
            fetchBlogs(); // Refresh list
        } catch (err: any) {
            setError(err.message || 'Failed to create blog post.');
        }
    };

    if (loading) {
        return <div className="flex justify-center mt-16"><Spinner size="lg" color="teal"/></div>;
    }

    if (error) {
        return <p className="text-center text-red-500 mt-8">{error}</p>;
    }

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8 border-b pb-4">
                <h1 className="text-4xl font-bold text-gray-800">Community Blogs</h1>
                <button 
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center space-x-2 px-5 py-2.5 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-all duration-300 shadow-md hover:shadow-lg"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    <span>{showForm ? 'Cancel' : 'Write a New Article'}</span>
                </button>
            </div>

            {showForm && <CreateBlogForm onCreate={handleCreateBlog} />}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {blogs.map(blog => (
                    <BlogCard key={blog.id} blog={blog} onNavigate={navigateToBlog} />
                ))}
            </div>
        </div>
    );
};

interface BlogCardProps {
    blog: Blog;
    onNavigate: (blog: Blog) => void;
}

const BlogCard: React.FC<BlogCardProps> = ({ blog, onNavigate }) => {
    const stripHtml = (html: string) => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return doc.body.textContent || "";
    };
    
    const plainTextContent = stripHtml(blog.content);
    const previewContent = plainTextContent.substring(0, 150);

    return (
        <div className="bg-white rounded-xl shadow-md overflow-hidden transform hover:-translate-y-2 transition-transform duration-300 ease-in-out group">
            <div className="relative">
                <img className="w-full h-56 object-cover" src={blog.coverImageUrl || DEFAULT_BLOG_COVER_IMAGE} alt={blog.title} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
            </div>
            <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-teal-600 transition-colors">{blog.title}</h2>
                <div className="flex items-center text-sm text-gray-500 mb-4">
                    <img src={blog.author.avatarUrl || "/avatar.jpg"} alt={blog.author.name} className="w-9 h-9 rounded-full object-cover mr-3 border-2 border-white" />
                    <span>By <span className="font-semibold">{blog.author.name}</span></span>
                    <span className="mx-2">&middot;</span>
                    <span>{formatDate(blog.created_at)}</span>
                </div>
                <p className="text-gray-700 leading-relaxed mb-4">{previewContent}{plainTextContent.length > 150 ? '...' : ''}</p>
                <button 
                    onClick={() => onNavigate(blog)} 
                    className="font-semibold text-teal-500 hover:text-teal-700 transition-colors"
                >
                    Read Full Article &rarr;
                </button>
            </div>
        </div>
    );
};


const CreateBlogForm: React.FC<{ onCreate: (data: CreateBlogData) => Promise<void> }> = ({ onCreate }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [coverImage, setCoverImage] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) return;

        setLoading(true);
        await onCreate({ title, content, coverImage: coverImage || undefined });
        setLoading(false);
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">New Blog Post</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" placeholder="Blog Title" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500" required />
                
                <RichTextEditor 
                    value={content}
                    onChange={setContent}
                    placeholder="Write your article here..."
                    minHeight="250px"
                />

                <div>
                    <label className="block text-sm font-medium text-gray-700">Cover Image (Optional)</label>
                    <input type="file" accept="image/*" onChange={e => setCoverImage(e.target.files?.[0] || null)} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100" />
                </div>
                <div className="flex justify-end">
                    <button type="submit" disabled={loading} className="px-6 py-2 bg-teal-500 text-white rounded-md hover:bg-teal-600 disabled:bg-teal-300 font-semibold">
                        {loading ? <Spinner /> : 'Publish Article'}
                    </button>
                </div>
            </form>
        </div>
    );
};


export default Blogs;