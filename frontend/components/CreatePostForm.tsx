
import React, { useState, useRef } from 'react';
import Spinner from './Spinner';
import { useAuth } from '../contexts/AuthContext';
import { Role, DisplayNamePreference } from '../types';

interface CreatePostFormProps {
    onCreatePost: (text: string, mediaFile: File | null, displayNamePreference: DisplayNamePreference, tags: string[]) => Promise<void>;
}

const CreatePostForm: React.FC<CreatePostFormProps> = ({ onCreatePost }) => {
    const { user } = useAuth();
    const [text, setText] = useState('');
    const [tags, setTags] = useState('');
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
    const [loading, setLoading] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [displayPreference, setDisplayPreference] = useState<DisplayNamePreference>(DisplayNamePreference.FullName);
    const [phiConfirmed, setPhiConfirmed] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setMediaFile(file);
            setPreview(URL.createObjectURL(file));
            if (file.type.startsWith('video/')) {
                setMediaType('video');
            } else {
                setMediaType('image');
            }
        }
    };

    const handleRemoveMedia = () => {
        setMediaFile(null);
        setPreview(null);
        setMediaType(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleNextStep = (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim() && !mediaFile) return;
        setShowPreview(true);
    };

    const handleBackToEdit = () => {
        setShowPreview(false);
    };

    const handleProceedToConfirm = () => {
        setShowConfirmation(true);
    };

    const handleBackToPreview = () => {
        setShowConfirmation(false);
    };

    const handleFinalPost = async () => {
        if (!phiConfirmed) return;
        
        setLoading(true);
        const tagsArray = tags.split(',').map(tag => tag.trim()).filter(Boolean);
        await onCreatePost(text, mediaFile, displayPreference, tagsArray);
        
        // Reset everything
        setText('');
        setTags('');
        handleRemoveMedia();
        setShowPreview(false);
        setShowConfirmation(false);
        setDisplayPreference(DisplayNamePreference.FullName);
        setPhiConfirmed(false);
        setLoading(false);
    };

    if (!user || (user.role !== Role.NURSE && user.role !== Role.ADMIN)) {
        return null;
    }

    const formatName = (user: any, preference: DisplayNamePreference): string => {
        if (preference === DisplayNamePreference.Anonymous) {
            return 'Anonymous';
        }

        const nameParts = user.name.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

        if (preference === DisplayNamePreference.FullName) {
            const lastInitial = lastName ? ` ${lastName.charAt(0)}.` : '';
            const title = user.title ? `, ${user.title}` : '';
            return `${firstName}${lastInitial}${title}`.replace(/ ,/g, ',');
        }

        return user.name;
    };

    return (
        <div className="bg-white p-4 rounded-lg shadow-md mb-6">
            <div className="flex items-start space-x-4">
                <img src={user?.avatarUrl || "/avatar.jpg"} alt={user?.name} className="w-12 h-12 rounded-full object-cover" />
                
                {!showPreview && !showConfirmation ? (
                        // Step 1: Create Post Form
                        <form onSubmit={handleNextStep} className="w-full">
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Share your thoughts or a case study..."
                            className="w-full p-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none"
                            rows={3}
                        />
                         <input
                            type="text"
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            placeholder="Add tags (e.g., cardiology, pediatrics)..."
                            className="w-full p-2 mt-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-400 text-sm"
                        />
                         {preview && (
                            <div className="mt-2 relative">
                                {mediaType === 'image' ? (
                                    <img src={preview} alt="Media preview" className="rounded-lg max-h-60 w-auto" />
                                ) : (
                                    <video src={preview} controls className="rounded-lg max-h-60 w-auto" />
                                )}
                                <button type="button" onClick={handleRemoveMedia} className="absolute top-2 right-2 bg-gray-800 bg-opacity-50 text-white rounded-full p-1 hover:bg-opacity-75">
                                    <svg xmlns="http://www.w.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                        )}
                        <div className="flex justify-between items-center mt-2">
                            <input
                                type="file"
                                accept="image/*,video/*"
                                onChange={handleFileChange}
                                ref={fileInputRef}
                                className="hidden"
                                id="media-upload"
                            />
                            <label htmlFor="media-upload" className="cursor-pointer text-teal-500 hover:text-teal-600">
                               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            </label>
                            <button type="submit" disabled={loading || (!text.trim() && !mediaFile)} className="px-6 py-2 bg-teal-500 text-white rounded-full font-semibold hover:bg-teal-600 transition-colors disabled:bg-teal-300 disabled:cursor-not-allowed flex items-center">
                                {loading ? <Spinner /> : 'Next'}
                            </button>
                        </div>
                    </form>
                    ) : showPreview && !showConfirmation ? (
                        // Step 2: Preview and Confirm
                        <div className="w-full">
                            <div className="mb-4">
                                <h3 className="text-lg font-semibold text-gray-800 mb-2">Preview Your Post</h3>
                                <div className="bg-gray-50 p-4 rounded-lg border">
                                    <p className="text-gray-800 whitespace-pre-wrap">{text}</p>
                                    {preview && (
                                        <div className="mt-3">
                                            {mediaType === 'image' ? (
                                                <img src={preview} alt="Media preview" className="rounded-lg max-h-60 w-auto" />
                                            ) : (
                                                <video src={preview} controls className="rounded-lg max-h-60 w-auto" />
                                            )}
                                        </div>
                                    )}
                                    {tags && (
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {tags.split(',').map((tag, index) => (
                                                <span key={index} className="px-2 py-1 bg-teal-100 text-teal-800 text-sm rounded-full">
                                                    {tag.trim()}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="flex justify-between items-center">
                                <button 
                                    onClick={handleBackToEdit}
                                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-full font-semibold hover:bg-gray-300 transition-colors"
                                >
                                    Back to Edit
                                </button>
                                <button 
                                    onClick={handleProceedToConfirm}
                                    className="px-6 py-2 bg-teal-500 text-white rounded-full font-semibold hover:bg-teal-600 transition-colors flex items-center"
                                >
                                    Continue to Post
                                </button>
                            </div>
                        </div>
                    ) : (
                        // Step 3: Final Confirmation
                        <div className="w-full">
                            <div className="mb-4">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Final Confirmation</h3>
                                
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="font-semibold text-gray-700 mb-2">How would you like your name displayed?</h4>
                                        <div className="space-y-2">
                                            <label className="flex items-start p-3 border rounded-md cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="displayNamePreference"
                                                    value={DisplayNamePreference.FullName}
                                                    checked={displayPreference === DisplayNamePreference.FullName}
                                                    onChange={() => setDisplayPreference(DisplayNamePreference.FullName)}
                                                    className="h-4 w-4 mt-1 text-teal-600 focus:ring-teal-500 border-gray-300"
                                                />
                                                <div className="ml-3 text-sm">
                                                    <span className="font-medium text-gray-900">First name, last initial, and title</span>
                                                    <p className="text-gray-500">(e.g., "{formatName(user, DisplayNamePreference.FullName)}")</p>
                                                </div>
                                            </label>
                                            <label className="flex items-start p-3 border rounded-md cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="displayNamePreference"
                                                    value={DisplayNamePreference.Anonymous}
                                                    checked={displayPreference === DisplayNamePreference.Anonymous}
                                                    onChange={() => setDisplayPreference(DisplayNamePreference.Anonymous)}
                                                    className="h-4 w-4 mt-1 text-teal-600 focus:ring-teal-500 border-gray-300"
                                                />
                                                <div className="ml-3 text-sm">
                                                    <span className="font-medium text-gray-900">Anonymous</span>
                                                    <p className="text-gray-500">(e.g., "Anonymous")</p>
                                                </div>
                                            </label>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-start">
                                        <div className="flex items-center h-5">
                                            <input
                                                id="phi_confirm"
                                                name="phi_confirm"
                                                type="checkbox"
                                                checked={phiConfirmed}
                                                onChange={(e) => setPhiConfirmed(e.target.checked)}
                                                className="focus:ring-teal-500 h-4 w-4 text-teal-600 border-gray-300 rounded"
                                            />
                                        </div>
                                        <div className="ml-3 text-sm">
                                            <label htmlFor="phi_confirm" className="font-medium text-gray-700 cursor-pointer">
                                                I confirm I have removed patient identification information (PHI)
                                            </label>
                                            <p className="text-gray-500">
                                                Ensure all patient identifiers, including names, dates, locations, and any other information that could identify individuals, have been removed.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex justify-between items-center">
                                <button 
                                    onClick={handleBackToPreview}
                                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-full font-semibold hover:bg-gray-300 transition-colors"
                                >
                                    Back to Preview
                                </button>
                                <button 
                                    onClick={handleFinalPost}
                                    disabled={!phiConfirmed || loading}
                                    className="px-6 py-2 bg-teal-500 text-white rounded-full font-semibold hover:bg-teal-600 transition-colors disabled:bg-teal-300 disabled:cursor-not-allowed flex items-center"
                                >
                                    {loading ? <Spinner /> : 'Post'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
    );
};

export default CreatePostForm;