import React, { useRef, useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Role } from '../types';
import { updateAvatar, updateProfile, createFeedback } from '../services/mockApi';
import Spinner from './Spinner';

const getInitials = (name: string) => {
    const names = name.split(' ');
    const initials = names.map(n => n[0]).join('');
    return initials.slice(0, 2).toUpperCase();
};

const Avatar: React.FC<{ name: string, avatarUrl?: string | null, size: string }> = ({ name, avatarUrl, size }) => {
    const colors = [
        'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500', 'bg-lime-500',
        'bg-green-500', 'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-sky-500',
        'bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500',
        'bg-pink-500', 'bg-rose-500'
    ];
    const colorIndex = (name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % colors.length;
    const color = colors[colorIndex];

    if (avatarUrl) {
        return <img src={avatarUrl} alt={name} className={`${size} rounded-full object-cover shadow-md`} />;
    }

    // Use default avatar.jpg from frontend folder
    return <img src="/avatar.jpg" alt={name} className={`${size} rounded-full object-cover shadow-md`} />;
};

const titleOptions = ['Dr', 'DO', 'DNP', 'NP', 'RN', 'LPN', 'LVN', 'CMA', 'PTOP', 'Other'];

const Profile: React.FC = () => {
    const { user, updateUser } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isEditing, setIsEditing] = useState(false);
    const [avatarLoading, setAvatarLoading] = useState(false);
    const [profileLoading, setProfileLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Feedback form state
    const [showFeedbackForm, setShowFeedbackForm] = useState(false);
    const [feedbackContent, setFeedbackContent] = useState('');
    const [feedbackRating, setFeedbackRating] = useState(5);
    const [feedbackLoading, setFeedbackLoading] = useState(false);
    const [feedbackSuccess, setFeedbackSuccess] = useState(false);
    
    // Form state
    const [title, setTitle] = useState(user?.title || '');
    const [customTitle, setCustomTitle] = useState('');
    const [department, setDepartment] = useState(user?.department || '');
    const [userState, setUserState] = useState(user?.state || '');
    const [bio, setBio] = useState(user?.bio || '');

    useEffect(() => {
        if (user) {
            const isStandardTitle = titleOptions.includes(user.title || '');
            setTitle(isStandardTitle ? user.title || '' : 'Other');
            setCustomTitle(isStandardTitle ? '' : user.title || '');
            setDepartment(user.department || '');
            setUserState(user.state || '');
            setBio(user.bio || '');
        }
    }, [user, isEditing]);


    if (!user) {
        return <p className="text-center text-red-500">You must be logged in to view this page.</p>;
    }

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setAvatarLoading(true);
        setError(null);
        try {
            const updatedUser = await updateAvatar(file);
            updateUser(updatedUser);
        } catch (err: any) {
            setError(err.message || 'Failed to upload avatar.');
        } finally {
            setAvatarLoading(false);
        }
    };
    
    const handleSaveProfile = async () => {
        setProfileLoading(true);
        setError(null);
        try {
            const finalTitle = title === 'Other' ? customTitle : title;
            const updatedUser = await updateProfile({
                title: finalTitle,
                department,
                state: userState,
                bio
            });
            updateUser(updatedUser);
            setIsEditing(false);
        } catch (err: any) {
            setError(err.message || 'Failed to save profile.');
        } finally {
            setProfileLoading(false);
        }
    };

    const handleSubmitFeedback = async () => {
        if (!feedbackContent.trim()) return;
        
        setFeedbackLoading(true);
        setError(null);
        
        try {
            await createFeedback(feedbackContent, feedbackRating);
            setFeedbackSuccess(true);
            setFeedbackContent('');
            setFeedbackRating(5);
            setTimeout(() => {
                setFeedbackSuccess(false);
                setShowFeedbackForm(false);
            }, 2000);
        } catch (err: any) {
            setError(err.message || 'Failed to submit feedback');
        } finally {
            setFeedbackLoading(false);
        }
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setError(null);
    };

    const getRoleBadgeClasses = (role: Role) => {
        switch (role) {
            case Role.ADMIN: return 'bg-purple-200 text-purple-800';
            case Role.NURSE: return 'bg-green-200 text-green-800';
            case Role.PENDING: return 'bg-yellow-200 text-yellow-800';
            default: return 'bg-gray-200 text-gray-800';
        }
    };
    
    const completionPercentage = user.profileCompletionPercentage ?? 0;

    const renderInfoRow = (label: string, value: string | undefined) => (
        <div>
            <dt className="text-sm font-medium text-gray-500">{label}</dt>
            <dd className="mt-1 text-sm text-gray-900">{value || <span className="italic text-gray-400">Not set</span>}</dd>
        </div>
    );

    const renderTextField = (label: string, id: string, value: string, setter: (val: string) => void, placeholder: string) => (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label>
            <input type="text" id={id} value={value} onChange={e => setter(e.target.value)} placeholder={placeholder} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm" />
        </div>
    );

    return (
        <div className="max-w-2xl mx-auto mt-10 bg-white p-6 sm:p-8 rounded-lg shadow-lg">
            <div className="flex flex-col items-center sm:flex-row sm:items-start sm:space-x-6">
                <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                    <div className="w-24 h-24 sm:w-32 sm:h-32 border-4 border-teal-500 rounded-full">
                       <Avatar name={user.name} avatarUrl={user.avatarUrl} size="w-full h-full" />
                    </div>
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 rounded-full flex items-center justify-center transition-opacity">
                        {!avatarLoading && <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                        {avatarLoading && <Spinner color="white" />}
                    </div>
                </div>
                 <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg" />

                <div className="text-center sm:text-left mt-4 sm:mt-0 flex-grow">
                    <h2 className="text-3xl font-bold text-gray-800">{user.name}</h2>
                    <p className="text-gray-500 mt-1 mb-2">{user.email}</p>
                    <span className={`text-sm font-medium px-3 py-1 rounded-full ${getRoleBadgeClasses(user.role)}`}>{user.role}</span>
                </div>

                {!isEditing && (
                    <button onClick={() => setIsEditing(true)} className="mt-4 sm:mt-0 flex-shrink-0 px-4 py-2 bg-teal-500 text-white rounded-md hover:bg-teal-600 font-semibold text-sm">
                        Edit Profile
                    </button>
                )}
            </div>

            <div className="mt-8 border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Profile Completion</h3>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                    <div className="bg-teal-500 h-2.5 rounded-full" style={{ width: `${completionPercentage}%` }}></div>
                </div>

                {error && <p className="text-sm text-red-500 my-4 bg-red-100 p-3 rounded-md">{error}</p>}
                
                {isEditing ? (
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
                            <select id="title" value={title} onChange={e => setTitle(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm rounded-md">
                                {titleOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                            {title === 'Other' && renderTextField('Custom Title', 'customTitle', customTitle, setCustomTitle, 'e.g., Paramedic')}
                        </div>
                        {renderTextField('Department/Specialty', 'department', department, setDepartment, 'e.g., Emergency Medicine')}
                        {renderTextField('State', 'state', userState, setUserState, 'e.g., California')}
                        <div>
                            <label htmlFor="bio" className="block text-sm font-medium text-gray-700">Brief Narration</label>
                            <textarea id="bio" value={bio} onChange={e => setBio(e.target.value)} rows={4} placeholder="Tell us a bit about your professional background..." className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"></textarea>
                        </div>
                        <div className="flex justify-end space-x-3">
                            <button onClick={handleCancelEdit} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-semibold">Cancel</button>
                            <button onClick={handleSaveProfile} disabled={profileLoading} className="px-6 py-2 bg-teal-500 text-white rounded-md hover:bg-teal-600 disabled:bg-teal-300 flex items-center justify-center w-28 font-semibold">
                                {profileLoading ? <Spinner /> : 'Save'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                        {renderInfoRow('Title', user.title)}
                        {renderInfoRow('Department/Specialty', user.department)}
                        {renderInfoRow('State', user.state)}
                        <div className="sm:col-span-2">
                           <dt className="text-sm font-medium text-gray-500">About</dt>
                           <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{user.bio || <span className="italic text-gray-400">No bio provided.</span>}</dd>
                        </div>
                    </dl>
                )}
            </div>

            {/* Feedback Section */}
            <div className="bg-white rounded-xl shadow-lg p-8">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold text-gray-800">Share Your Experience</h3>
                    <button
                        onClick={() => setShowFeedbackForm(!showFeedbackForm)}
                        className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
                    >
                        {showFeedbackForm ? 'Cancel' : 'Leave Feedback'}
                    </button>
                </div>
                
                <p className="text-gray-600 mb-6">
                    Help us improve PulseLoopCare by sharing your experience. Your feedback may be featured on our landing page to help other healthcare professionals.
                </p>

                {showFeedbackForm && (
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Rating (1-5 stars)
                            </label>
                            <div className="flex space-x-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        onClick={() => setFeedbackRating(star)}
                                        className={`text-2xl ${
                                            star <= feedbackRating 
                                                ? 'text-yellow-400' 
                                                : 'text-gray-300'
                                        } hover:text-yellow-400 transition-colors`}
                                    >
                                        ★
                                    </button>
                                ))}
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Your Feedback
                            </label>
                            <textarea
                                value={feedbackContent}
                                onChange={(e) => setFeedbackContent(e.target.value)}
                                placeholder="Share your experience with PulseLoopCare..."
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                                rows={4}
                            />
                        </div>
                        
                        <div className="flex space-x-4">
                            <button
                                onClick={handleSubmitFeedback}
                                disabled={feedbackLoading || !feedbackContent.trim()}
                                className="px-6 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {feedbackLoading ? 'Submitting...' : 'Submit Feedback'}
                            </button>
                            <button
                                onClick={() => setShowFeedbackForm(false)}
                                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                        
                        {feedbackSuccess && (
                            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                <p className="text-green-800 font-medium">
                                    ✅ Thank you for your feedback! It has been submitted for review.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Profile;
