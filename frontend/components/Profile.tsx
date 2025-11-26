import React, { useRef, useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Role, User, Promotion } from '../types';
import { updateAvatar, updateProfile, createFeedback, getUsersDirectory, createPromotion, getPosts, getMyPromotions, updatePromotion } from '../services/mockApi';
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
        return <img src={avatarUrl} alt={name} className={`${size} rounded-lg object-cover shadow-md`} />;
    }

    // Use default avatar.jpg from frontend folder
    return <img src="/avatar.jpg" alt={name} className={`${size} rounded-lg object-cover shadow-md`} />;
};

const titleOptions = ['Dr', 'MD', 'DO', 'NP', 'DNP', 'Nurse', 'RN', 'BSN', 'MSN', 'LPN', 'LVN', 'CNA', 'CMA', 'PA', 'PTOP', 'PT', 'OT', 'PharmD', 'RPh', 'RT', 'RRT', 'EMT', 'Paramedic', 'MA', 'Other'];

const Profile: React.FC = () => {
    const { user, updateUser, logout } = useAuth();
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

    // Business profile state
    const [isBusiness, setIsBusiness] = useState<boolean>(user?.isBusiness || false);
    const [businessName, setBusinessName] = useState<string>(user?.businessName || '');
    const [businessDescription, setBusinessDescription] = useState<string>(user?.businessDescription || '');
    const [businessWebsite, setBusinessWebsite] = useState<string>(user?.businessWebsite || '');

    // Simple stats moved from feed
    const [totalPosts, setTotalPosts] = useState<number | null>(null);
    const [samplePagePosts, setSamplePagePosts] = useState<number | null>(null);

    useEffect(() => {
        if (user) {
            const isStandardTitle = titleOptions.includes(user.title || '');
            setTitle(isStandardTitle ? user.title || '' : 'Other');
            setCustomTitle(isStandardTitle ? '' : user.title || '');
            setDepartment(user.department || '');
            setUserState(user.state || '');
            setBio(user.bio || '');
            setIsBusiness(!!user.isBusiness);
            setBusinessName(user.businessName || '');
            setBusinessDescription(user.businessDescription || '');
            setBusinessWebsite(user.businessWebsite || '');
        }
    }, [user, isEditing]);

    useEffect(() => {
        // Load simple post stats for display on profile
        const loadStats = async () => {
            try {
                const result = await getPosts(1, 10);
                setTotalPosts(result.total);
                setSamplePagePosts(result.posts.length);
            } catch (e) {
                console.error('Failed to load post stats for profile', e);
            }
        };
        loadStats();
    }, []);


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
                bio,
                isBusiness,
                businessName: isBusiness ? businessName : undefined,
                businessDescription: isBusiness ? businessDescription : undefined,
                businessWebsite: isBusiness ? businessWebsite : undefined,
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
                    <div className="w-32 h-32 sm:w-40 sm:h-40 border-4 border-teal-500 rounded-xl overflow-hidden">
                       <Avatar name={user.name} avatarUrl={user.avatarUrl} size="w-full h-full" />
                    </div>
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 rounded-xl flex items-center justify-center transition-opacity">
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
                    <div className="mt-4 sm:mt-0 flex-shrink-0 flex flex-col space-y-2 items-stretch sm:items-end">
                        <button 
                            onClick={() => setIsEditing(true)} 
                            className="px-4 py-2 bg-teal-500 text-white rounded-md hover:bg-teal-600 font-semibold text-sm"
                        >
                            Edit Profile
                        </button>
                        <button
                            onClick={logout}
                            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 font-semibold text-sm"
                        >
                            Logout
                        </button>
                    </div>
                )}
            </div>

            <div className="mt-8 border-t pt-6 space-y-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Profile Overview</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    <div className="bg-teal-50 border border-teal-100 rounded-lg p-4 text-center">
                        <div className="text-xl font-bold text-teal-700">{totalPosts ?? '—'}</div>
                        <div className="text-xs text-teal-900/70 mt-1">Total Posts</div>
                    </div>
                    <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 text-center">
                        <div className="text-xl font-bold text-indigo-700">{samplePagePosts ?? '—'}</div>
                        <div className="text-xs text-indigo-900/70 mt-1">Posts Sample Page</div>
                    </div>
                    <div className="bg-cyan-50 border border-cyan-100 rounded-lg p-4 text-center">
                        <div className="text-sm font-semibold text-cyan-700">{user.role}</div>
                        <div className="text-xs text-cyan-900/70 mt-1">Your Role</div>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 text-center">
                        <div className="text-xl font-bold text-emerald-700">
                            {completionPercentage}%
                        </div>
                        <div className="text-xs text-emerald-900/70 mt-1">Profile Complete</div>
                    </div>
                </div>

                <h4 className="text-md font-semibold text-gray-800 mb-2">Profile Details</h4>
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

                        <div className="border-t pt-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-700">This account represents a business</p>
                                    <p className="text-xs text-gray-500">
                                        Enable this if you are a clinic, organization, or business promoting services.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsBusiness(!isBusiness)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                        isBusiness ? 'bg-teal-500' : 'bg-gray-300'
                                    }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                            isBusiness ? 'translate-x-5' : 'translate-x-1'
                                        }`}
                                    />
                                </button>
                            </div>

                            {isBusiness && (
                                <div className="space-y-3">
                                    {renderTextField('Business Name', 'businessName', businessName, setBusinessName, 'e.g., PulseLoop Health Clinic')}
                                    <div>
                                        <label htmlFor="businessDescription" className="block text-sm font-medium text-gray-700">Business Description</label>
                                        <textarea
                                            id="businessDescription"
                                            value={businessDescription}
                                            onChange={(e) => setBusinessDescription(e.target.value)}
                                            rows={3}
                                            placeholder="Briefly describe your business, services, or products..."
                                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                                        />
                                    </div>
                                    {renderTextField('Business Website or Link', 'businessWebsite', businessWebsite, setBusinessWebsite, 'https://your-business.com')}
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end space-x-3">
                            <button onClick={handleCancelEdit} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-semibold">Cancel</button>
                            <button onClick={handleSaveProfile} disabled={profileLoading} className="px-6 py-2 bg-teal-500 text-white rounded-md hover:bg-teal-600 disabled:bg-teal-300 flex items-center justify-center w-28 font-semibold">
                                {profileLoading ? <Spinner /> : 'Save'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                            {renderInfoRow('Title', user.title)}
                            {renderInfoRow('Department/Specialty', user.department)}
                            {renderInfoRow('State', user.state)}
                            <div className="sm:col-span-2">
                                <dt className="text-sm font-medium text-gray-500">About</dt>
                                <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                                    {user.bio || <span className="italic text-gray-400">No bio provided.</span>}
                                </dd>
                            </div>
                        </dl>

                        {user.isBusiness && (
                            <div className="mt-6 border-t pt-4">
                                <h4 className="text-md font-semibold text-gray-800 mb-2">Business Profile</h4>
                                <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                                    {renderInfoRow('Business Name', user.businessName)}
                                    {renderInfoRow('Business Website', user.businessWebsite)}
                                    <div className="sm:col-span-2">
                                        <dt className="text-sm font-medium text-gray-500">Business Description</dt>
                                        <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                                            {user.businessDescription || <span className="italic text-gray-400">No description provided.</span>}
                                        </dd>
                                    </div>
                                </dl>
                            </div>
                        )}
                    </>
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

            {/* Business Promotions Section */}
            {user.isBusiness && (
                <div className="bg-white rounded-xl shadow-lg p-8 mt-8">
                    <h3 className="text-2xl font-bold text-gray-800 mb-4">Business Promotions</h3>
                    <p className="text-gray-600 mb-4 text-sm">
                        Create a promotion for your business or product. After admin approval, it may appear as an advertisement banner for users.
                    </p>
                    <BusinessPromotionsSection />
                </div>
            )}
        </div>
    );
};

const BusinessPromotionsSection: React.FC = () => {
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editing, setEditing] = useState<Promotion | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editImageUrl, setEditImageUrl] = useState('');
    const [editTargetUrl, setEditTargetUrl] = useState('');
    const [savingEdit, setSavingEdit] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const loadPromotions = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getMyPromotions();
            setPromotions(data);
        } catch (err: any) {
            setError(err?.message || 'Failed to load your promotions.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPromotions();
    }, []);

    const handleStartEdit = (promo: Promotion) => {
        setEditing(promo);
        setEditTitle(promo.title);
        setEditDescription(promo.description || '');
        setEditImageUrl(promo.imageUrl || '');
        setEditTargetUrl(promo.targetUrl || '');
        setMessage(null);
        setError(null);
    };

    const handleSaveEdit = async () => {
        if (!editing) return;
        if (!editTitle.trim()) {
            setError('Title is required.');
            return;
        }
        setSavingEdit(true);
        setError(null);
        try {
            const updated = await updatePromotion(editing.id, {
                title: editTitle.trim(),
                description: editDescription.trim() || null,
                imageUrl: editImageUrl.trim() || null,
                targetUrl: editTargetUrl.trim() || null,
            });
            setPromotions(prev => prev.map(p => (p.id === updated.id ? updated : p)));
            setEditing(null);
            setMessage('Promotion updated. It is now pending admin review again.');
        } catch (err: any) {
            setError(err?.message || 'Failed to update promotion.');
        } finally {
            setSavingEdit(false);
        }
    };

    return (
        <div className="space-y-6">
            <BusinessPromotionForm
                onCreated={(promo) => {
                    setPromotions(prev => [promo, ...prev]);
                }}
            />

            {loading && (
                <div className="text-sm text-gray-500">Loading your promotions...</div>
            )}
            {error && (
                <div className="p-3 rounded-md bg-red-50 text-red-700 text-sm">
                    {error}
                </div>
            )}
            {message && (
                <div className="p-3 rounded-md bg-green-50 text-green-700 text-sm">
                    {message}
                </div>
            )}

            {promotions.length > 0 && (
                <div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-3">Your Promotions</h4>
                    <div className="space-y-3">
                        {promotions.map((promo) => (
                            <div key={promo.id} className="border border-gray-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-gray-900 truncate">{promo.title}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        Status:{' '}
                                        <span className="font-medium">
                                            {promo.status.toLowerCase()}
                                            {promo.status === 'APPROVED' && (
                                                promo.isActive === false ? ' (inactive)' : ' (active)'
                                            )}
                                        </span>
                                    </p>
                                    {promo.description && (
                                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                            {promo.description}
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleStartEdit(promo)}
                                        className="px-3 py-1 text-xs font-semibold rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                                    >
                                        Edit
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {editing && (
                <div className="border border-teal-200 rounded-lg p-4 bg-teal-50">
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">Edit Promotion</h4>
                    <p className="text-xs text-gray-600 mb-3">
                        After saving changes, this promotion will be sent back to admin for approval and may temporarily stop appearing as an ad.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Promotion Title</label>
                            <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                                required
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Image URL (optional)</label>
                            <input
                                type="url"
                                value={editImageUrl}
                                onChange={(e) => setEditImageUrl(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Target Link (optional)</label>
                            <input
                                type="url"
                                value={editTargetUrl}
                                onChange={(e) => setEditTargetUrl(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                        <button
                            type="button"
                            onClick={() => setEditing(null)}
                            className="px-4 py-1 text-sm rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveEdit}
                            disabled={savingEdit}
                            className="px-4 py-1 text-sm rounded-md bg-teal-500 text-white hover:bg-teal-600 disabled:bg-teal-300"
                        >
                            {savingEdit ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const BusinessPromotionForm: React.FC<{ onCreated?: (promotion: Promotion) => void }> = ({ onCreated }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [targetUrl, setTargetUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            setErrorMessage('Title is required.');
            return;
        }
        setLoading(true);
        setErrorMessage(null);
        try {
            const promo = await createPromotion({
                title: title.trim(),
                description: description.trim() || undefined,
                imageUrl: imageUrl.trim() || undefined,
                targetUrl: targetUrl.trim() || undefined,
            });
            onCreated?.(promo);
            setSuccessMessage('Promotion submitted for admin review.');
            setTitle('');
            setDescription('');
            setImageUrl('');
            setTargetUrl('');
            setTimeout(() => setSuccessMessage(null), 4000);
        } catch (err: any) {
            setErrorMessage(err?.message || 'Failed to create promotion.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
                <div className="p-3 rounded-md bg-red-50 text-red-700 text-sm">
                    {errorMessage}
                </div>
            )}
            {successMessage && (
                <div className="p-3 rounded-md bg-green-50 text-green-700 text-sm">
                    {successMessage}
                </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Promotion Title</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                        placeholder="e.g., 20% off annual subscription"
                        required
                    />
                </div>
                <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                        placeholder="Briefly describe your promotion or offer..."
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Image URL (optional)</label>
                    <input
                        type="url"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                        placeholder="https://example.com/banner.png"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Target Link (optional)</label>
                    <input
                        type="url"
                        value={targetUrl}
                        onChange={(e) => setTargetUrl(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                        placeholder="https://your-business.com/product"
                    />
                </div>
            </div>
            <div className="flex justify-end">
                <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-teal-500 text-white rounded-md hover:bg-teal-600 disabled:bg-teal-300 font-semibold text-sm flex items-center justify-center"
                >
                    {loading ? <Spinner /> : 'Submit Promotion'}
                </button>
            </div>
        </form>
    );
};

export default Profile;

// Professionals directory for non-admin users
export const ProfessionalsDirectory: React.FC<{ initialUserId?: string; onSearchResult?: (result: any) => void }> = ({ initialUserId }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [countryFilter, setCountryFilter] = useState<string>('');
    const [titleFilter, setTitleFilter] = useState<string>('');

    const loadUsers = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getUsersDirectory();
            setUsers(data);
            if (initialUserId) {
                const found = data.find((u) => u.id === initialUserId) || null;
                setSelectedUser(found);
            }
        } catch (e: any) {
            setError(e?.message || 'Failed to load professionals.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const uniqueCountries = Array.from(new Set(users.map((u) => u.state).filter(Boolean))).sort();
    const uniqueTitles = Array.from(new Set(users.map((u) => u.title).filter(Boolean))).sort();

    const filteredUsers = users.filter((u) => {
        const matchesCountry = countryFilter ? u.state === countryFilter : true;
        const matchesTitle = titleFilter ? u.title === titleFilter : true;
        return matchesCountry && matchesTitle;
    });

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Healthcare Professionals</h2>
                    <p className="text-sm text-gray-500">
                        {selectedUser
                            ? 'Viewing professional profile.'
                            : 'Browse and filter verified members by country/state and title.'}
                    </p>
                </div>
                {!selectedUser && (
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <select
                            value={countryFilter}
                            onChange={(e) => setCountryFilter(e.target.value)}
                            className="flex-1 sm:w-40 px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                        >
                            <option value="">All Countries / States</option>
                            {uniqueCountries.map((state) => (
                                <option key={state} value={state as string}>
                                    {state}
                                </option>
                            ))}
                        </select>
                        <select
                            value={titleFilter}
                            onChange={(e) => setTitleFilter(e.target.value)}
                            className="flex-1 sm:w-40 px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                        >
                            <option value="">All Titles</option>
                            {uniqueTitles.map((title) => (
                                <option key={title} value={title as string}>
                                    {title}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-md text-sm">
                    {error}
                </div>
            )}

            {!selectedUser ? (
                <div className="bg-white rounded-xl shadow border border-gray-200 p-3 max-h-[520px] overflow-y-auto">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Spinner size="md" color="teal" />
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <p className="text-sm text-gray-500">No professionals found.</p>
                    ) : (
                        <ul className="divide-y divide-gray-100">
                            {filteredUsers.map((u) => (
                                <li key={u.id}>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedUser(u)}
                                        className="w-full flex items-center gap-4 px-3 py-3 text-left hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="w-16 h-16 rounded-xl overflow-hidden border border-gray-200 flex-shrink-0">
                                            <img
                                                src={u.avatarUrl || '/avatar.jpg'}
                                                alt={u.name}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-800 truncate">{u.name}</p>
                                            <p className="text-xs text-gray-500 truncate">
                                                {[u.title, u.state].filter(Boolean).join(' · ') || 'No details set'}
                                            </p>
                                        </div>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow border border-gray-200 p-6 space-y-4">
                    <button
                        type="button"
                        onClick={() => setSelectedUser(null)}
                        className="inline-flex items-center text-sm text-teal-600 hover:text-teal-700 mb-2"
                    >
                        <svg
                            className="w-4 h-4 mr-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to professionals list
                    </button>

                    <div className="flex items-center gap-5">
                        <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border-2 border-teal-500">
                            <img
                                src={selectedUser.avatarUrl || '/avatar.jpg'}
                                alt={selectedUser.name}
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-800">{selectedUser.name}</h3>
                            <p className="text-sm text-gray-600">
                                {[selectedUser.title, selectedUser.state].filter(Boolean).join(' · ')}
                            </p>
                        </div>
                    </div>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div>
                            <dt className="font-medium text-gray-500">Email</dt>
                            <dd className="mt-1 text-gray-800">{selectedUser.email}</dd>
                        </div>
                        <div>
                            <dt className="font-medium text-gray-500">Role</dt>
                            <dd className="mt-1 text-gray-800">{selectedUser.role}</dd>
                        </div>
                        <div>
                            <dt className="font-medium text-gray-500">Department / Specialty</dt>
                            <dd className="mt-1 text-gray-800">
                                {selectedUser.department || <span className="text-gray-400 italic">Not set</span>}
                            </dd>
                        </div>
                        <div>
                            <dt className="font-medium text-gray-500">State / Country</dt>
                            <dd className="mt-1 text-gray-800">
                                {selectedUser.state || <span className="text-gray-400 italic">Not set</span>}
                            </dd>
                        </div>
                    </dl>
                    <div>
                        <dt className="block text-sm font-medium text-gray-500 mb-1">Bio</dt>
                        <dd className="text-sm text-gray-800 whitespace-pre-wrap">
                            {selectedUser.bio || <span className="text-gray-400 italic">No bio provided.</span>}
                        </dd>
                    </div>
                </div>
            )}
        </div>
    );
};
