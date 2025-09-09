import React from 'react';
import { Post } from '../types';
import PostCard from './PostCard';

interface SinglePostViewProps {
    post: Post;
    navigateTo: (view: 'FEED') => void;
}

const SinglePostView: React.FC<SinglePostViewProps> = ({ post, navigateTo }) => {

    // When an update (comment/reaction) happens on the single post view, the most
    // robust way to see the change without complex state management is to return
    // to the feed, which always fetches the latest data.
    const handleUpdate = () => {
        console.log("Update triggered from single post view, returning to feed.");
        navigateTo('FEED'); 
    };

    return (
        <div className="max-w-2xl mx-auto">
             <button 
                onClick={() => navigateTo('FEED')} 
                className="mb-6 flex items-center text-teal-600 hover:text-teal-800 font-medium"
            >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Feed
            </button>
            <PostCard post={post} onUpdate={handleUpdate} isSingleView={true} />
        </div>
    );
};

export default SinglePostView;