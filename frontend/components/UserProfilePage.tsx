import React, { useState, useEffect } from 'react';
import { getAllUsers } from '../services/mockApi';
import { User, View } from '../types';
import Spinner from './Spinner';

interface UserProfilePageProps {
    onNavigate: (view: View) => void;
}

const UserProfilePage: React.FC<UserProfilePageProps> = ({ onNavigate }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchUserProfile = async () => {
            const userId = sessionStorage.getItem('selectedUserId');
            if (!userId) {
                setError('User ID not provided');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const users = await getAllUsers();
                const foundUser = users.find(u => u.id === userId);
                
                if (foundUser) {
                    setUser(foundUser);
                } else {
                    setError('User not found');
                }
            } catch (err) {
                setError('Failed to load user profile');
            } finally {
                setLoading(false);
            }
        };

        fetchUserProfile();
    }, []);

    const StatusBadge: React.FC<{text: string}> = ({ text }) => {
        const getBadgeClasses = (status: string) => {
            switch (status) {
                case 'ADMIN': return 'bg-purple-200 text-purple-800';
                case 'NURSE': return 'bg-green-200 text-green-800';
                case 'PENDING': return 'bg-yellow-200 text-yellow-800';
                case 'APPROVED': return 'bg-green-200 text-green-800';
                case 'REJECTED': return 'bg-red-200 text-red-800';
                case 'INACTIVE': return 'bg-gray-200 text-gray-800';
                default: return 'bg-gray-200 text-gray-800';
            }
        };
        
        return (
            <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${getBadgeClasses(text)}`}>
                {text}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Spinner size="lg" color="teal" />
                    <p className="mt-4 text-gray-600">Loading user profile...</p>
                </div>
            </div>
        );
    }

    if (error || !user) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
                    <div className="text-center">
                        <div className="text-red-500 text-6xl mb-4">⚠️</div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Error</h2>
                        <p className="text-gray-600 mb-6">{error || 'User not found'}</p>
                        <button
                            onClick={() => onNavigate('ADMIN')}
                            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                        >
                            Back to Admin Panel
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-4">
                {/* Header */}
                <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 mb-8">
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center space-x-4">
                                <button
                                    onClick={() => onNavigate('ADMIN')}
                                    className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors flex items-center space-x-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                    <span>Back to Admin Panel</span>
                                </button>
                                <h1 className="text-3xl font-bold text-gray-900">User Profile</h1>
                            </div>
                            <span className="text-sm font-medium text-gray-700 px-3 py-1 bg-gray-100 rounded-full">
                                {user.title || 'No title'}
                            </span>
                        </div>

                        {/* Profile Header */}
                        <div className="flex items-start space-x-6 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
                            <img 
                                src={user.avatarUrl || "/avatar.jpg"} 
                                alt={user.name} 
                                className="w-32 h-32 sm:w-40 sm:h-40 rounded-xl object-cover border-4 border-white shadow-lg"
                            />
                            <div className="flex-1">
                                <h2 className="text-3xl font-bold text-gray-900 mb-2">{user.name}</h2>
                                <p className="text-xl text-gray-700 font-medium mb-3">{user.email}</p>
                                <div className="flex items-center space-x-4">
                                    <span className="text-sm font-medium text-gray-700 px-3 py-1 bg-gray-100 rounded-full">
                                        {user.title || 'No title'}
                                    </span>
                                    <span className="text-sm text-gray-600">
                                        Profile Completion: {user.profileCompletionPercentage || 0}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Profile Details Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Professional Information */}
                    <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-6 border-b border-gray-300 pb-3">Professional Information</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center py-3 border-b border-gray-100">
                                <span className="font-semibold text-gray-800">Title:</span> 
                                <span className="text-gray-700 font-medium">{user.title || 'Not specified'}</span>
                            </div>
                            <div className="flex justify-between items-center py-3 border-b border-gray-100">
                                <span className="font-semibold text-gray-800">Department:</span> 
                                <span className="text-gray-700 font-medium">{user.department || 'Not specified'}</span>
                            </div>
                            <div className="flex justify-between items-center py-3 border-b border-gray-100">
                                <span className="font-semibold text-gray-800">State:</span> 
                                <span className="text-gray-700 font-medium">{user.state || 'Not specified'}</span>
                            </div>
                            <div className="flex justify-between items-center py-3">
                                <span className="font-semibold text-gray-800">Expertise Level:</span> 
                                <span className="text-gray-700 font-medium">{user.expertiseLevel || 'Not specified'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Account Information */}
                    <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-6 border-b border-gray-300 pb-3">Account Information</h3>
                        <div className="space-y-4">
                            <div className="py-3 border-b border-gray-100">
                                <span className="font-semibold text-gray-800 block mb-1">User ID:</span> 
                                <span className="text-gray-600 font-mono text-sm break-all">{user.id}</span>
                            </div>
                            <div className="flex justify-between items-center py-3 border-b border-gray-100">
                                <span className="font-semibold text-gray-800">Profile Completion:</span> 
                                <span className="text-gray-700 font-medium">{user.profileCompletionPercentage || 0}%</span>
                            </div>
                            <div className="flex justify-between items-center py-3">
                                <span className="font-semibold text-gray-800">Discussion Score:</span> 
                                <span className="text-gray-700 font-medium">{user.discussionContributionScore || 0}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bio Section */}
                {user.bio && (
                    <div className="mt-8 bg-white rounded-xl shadow-lg border-2 border-gray-200 p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-4 border-b border-gray-300 pb-3">Bio</h3>
                        <p className="text-gray-800 leading-relaxed font-medium">{user.bio}</p>
                    </div>
                )}

                {/* Expertise Areas */}
                {user.expertiseAreas && user.expertiseAreas.length > 0 && (
                    <div className="mt-8 bg-white rounded-xl shadow-lg border-2 border-gray-200 p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-4 border-b border-gray-300 pb-3">Expertise Areas</h3>
                        <div className="flex flex-wrap gap-3">
                            {user.expertiseAreas.map((area: string, index: number) => (
                                <span key={index} className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-md">
                                    {area}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Invitation Info */}
                {user.invitedByUser && (
                    <div className="mt-8 bg-white rounded-xl shadow-lg border-2 border-gray-200 p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-4 border-b border-gray-300 pb-3">Invited By</h3>
                        <p className="text-gray-800 font-medium">{user.invitedByUser.name}</p>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="mt-8 flex justify-center space-x-4">
                    <button
                        onClick={() => onNavigate('ADMIN')}
                        className="bg-gray-500 text-white px-8 py-3 rounded-lg hover:bg-gray-600 transition-colors font-semibold"
                    >
                        Back to Admin Panel
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="bg-blue-500 text-white px-8 py-3 rounded-lg hover:bg-blue-600 transition-colors font-semibold"
                    >
                        Print Profile
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UserProfilePage;
