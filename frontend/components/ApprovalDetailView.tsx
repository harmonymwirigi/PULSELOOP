import React from 'react';
import { Resource, Blog, ResourceType } from '../types';
import Spinner from './Spinner';

interface ApprovalDetailViewProps {
    item: Resource | Blog;
    onApprove: (id: string, type: 'RESOURCE' | 'BLOG') => void;
    onBack: () => void;
    isApproving: boolean;
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

const isBlog = (item: Resource | Blog): item is Blog => {
    return 'coverImageUrl' in item;
};

const ApprovalDetailView: React.FC<ApprovalDetailViewProps> = ({ item, onApprove, onBack, isApproving }) => {
    const itemType = isBlog(item) ? 'BLOG' : 'RESOURCE';

    const renderBlogContent = (blog: Blog) => (
        <>
            <header className="mb-8 border-b pb-6">
                <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight mb-4">{blog.title}</h1>
                <div className="flex items-center text-gray-500">
                    <img src={blog.author.avatarUrl || "/avatar.jpg"} alt={blog.author.name} className="w-12 h-12 rounded-full object-cover mr-4" />
                    <div>
                        <p className="font-semibold text-gray-800">{blog.author.name}</p>
                        <p className="text-sm">Posted on {formatDate(blog.created_at)}</p>
                    </div>
                </div>
            </header>
            <div className="mb-8 rounded-lg overflow-hidden shadow-md">
                <img src={blog.coverImageUrl || DEFAULT_BLOG_COVER_IMAGE} alt={blog.title} className="w-full h-auto object-cover" />
            </div>
            <div className="text-lg leading-relaxed space-y-6 text-gray-800 content-styles" dangerouslySetInnerHTML={{ __html: blog.content }} />
        </>
    );

    const renderResourceContent = (resource: Resource) => (
        <>
            <header className="mb-8 border-b pb-6">
                <h1 className="text-4xl font-bold text-gray-800 mb-2">{resource.title}</h1>
                 <div className="flex items-center text-gray-500">
                    <img src={resource.author.avatarUrl || "/avatar.jpg"} alt={resource.author.name} className="w-10 h-10 rounded-full object-cover mr-3" />
                    <div>
                        <p className="font-semibold text-gray-800">{resource.author.name}</p>
                        <p className="text-sm">Shared on {formatDate(resource.created_at)}</p>
                    </div>
                </div>
            </header>
            {resource.description && (
                <div className="mb-8">
                    <h2 className="text-2xl font-semibold text-gray-800 mb-3">Description</h2>
                    <div className="text-gray-800 content-styles" dangerouslySetInnerHTML={{ __html: resource.description }} />
                </div>
            )}
             <div>
                <h2 className="text-2xl font-semibold text-gray-800 mb-3">Link / File</h2>
                {resource.type === ResourceType.LINK && resource.content && (
                    <a href={resource.content} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline break-all">{resource.content}</a>
                )}
                {resource.type === ResourceType.FILE && resource.file_url && (
                    <a href={resource.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center space-x-2 text-teal-600 hover:underline">
                        <span>Download Attached File</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    </a>
                )}
            </div>
        </>
    );

    return (
        <div className="max-w-4xl mx-auto py-8">
            <button onClick={onBack} className="mb-6 flex items-center text-teal-600 hover:text-teal-800 font-medium">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                Back to Dashboard
            </button>
            
            <div className="bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 p-4 rounded-md mb-6">
                <h3 className="font-bold">Approval Preview</h3>
                <p>You are viewing this content before it becomes visible to all users. Review carefully before approving.</p>
            </div>
            
            <article className="bg-white p-6 sm:p-8 rounded-lg shadow-lg">
                {isBlog(item) ? renderBlogContent(item) : renderResourceContent(item)}
            </article>

            <div className="mt-8 p-4 bg-white rounded-lg shadow-lg flex items-center justify-end space-x-4 sticky bottom-4">
                <button onClick={onBack} className="px-5 py-2.5 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-semibold">
                    Back to List
                </button>
                <button 
                    onClick={() => onApprove(item.id, itemType)} 
                    disabled={isApproving}
                    className="px-8 py-2.5 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-green-300 font-semibold flex items-center justify-center w-36"
                >
                    {isApproving ? <Spinner /> : 'Approve'}
                </button>
            </div>
             <style>{`
                .content-styles p { margin-bottom: 1.25rem; line-height: 1.75; }
                .content-styles p:last-child { margin-bottom: 0; }
                .content-styles a { color: #0d9488; text-decoration: underline; }
                .content-styles a:hover { color: #0f766e; }
                .content-styles h1, .content-styles h2, .content-styles h3 { font-weight: bold; margin-bottom: 0.75rem; margin-top: 1.5rem; }
                .content-styles h1 { font-size: 1.875rem; }
                .content-styles h2 { font-size: 1.5rem; }
                .content-styles h3 { font-size: 1.25rem; }
                .content-styles ul, .content-styles ol { padding-left: 1.5rem; margin-bottom: 1.25rem; }
                .content-styles ul { list-style-type: disc; }
                .content-styles ol { list-style-type: decimal; }
                .content-styles li { margin-bottom: 0.5rem; }
            `}</style>
        </div>
    );
};

export default ApprovalDetailView;