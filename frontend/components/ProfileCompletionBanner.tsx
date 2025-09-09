import React from 'react';
import { User, View } from '../types';

interface ProfileCompletionBannerProps {
    user: User;
    navigateTo: (view: View) => void;
}

const ProfileCompletionBanner: React.FC<ProfileCompletionBannerProps> = ({ user, navigateTo }) => {
    const completionPercentage = user.profileCompletionPercentage ?? 0;

    return (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded-md mb-6 flex items-center justify-between shadow-sm">
            <div>
                <p className="font-bold">Complete Your Profile!</p>
                <p>Your profile is currently {completionPercentage}% complete. Add your title, specialty, and bio to help others in the community connect with you.</p>
            </div>
            <button
                onClick={() => navigateTo('PROFILE')}
                className="ml-4 flex-shrink-0 px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors font-semibold"
            >
                Go to Profile
            </button>
        </div>
    );
};

export default ProfileCompletionBanner;
