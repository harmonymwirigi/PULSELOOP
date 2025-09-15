import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { View } from '../types';

interface MobileNavProps {
    currentView: View;
    navigateTo: (view: View) => void;
    onOpenNotifications: () => void;
    onInviteClick: () => void;
}

const MobileNav: React.FC<MobileNavProps> = ({ 
    currentView, 
    navigateTo, 
    onOpenNotifications,
    onInviteClick 
}) => {
    const { user } = useAuth();

    // Mobile navigation is now handled in Header component
    // This component is kept for compatibility but returns null
    return null;
};

export default MobileNav;