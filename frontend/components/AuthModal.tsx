import React, { useState, useEffect } from 'react';
import Login from './Login';
import Signup from './Signup';

interface AuthModalProps {
    initialMode: 'login' | 'signup';
    onClose: () => void;
    invitationToken?: string | null;
    onViewPolicy: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ initialMode, onClose, invitationToken, onViewPolicy }) => {
    const [mode, setMode] = useState(initialMode);

    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
           if (event.key === 'Escape') {
              onClose();
           }
        };
        window.addEventListener('keydown', handleEsc);
        return () => {
            window.removeEventListener('keydown', handleEsc);
        };
    }, [onClose]);

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div 
                className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md relative"
                onClick={(e) => e.stopPropagation()} // Prevent click from closing modal
            >
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                    aria-label="Close"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                {mode === 'login' ? (
                    <Login onSwitchToSignup={() => setMode('signup')} />
                ) : (
                    <Signup onSwitchToLogin={() => setMode('login')} invitationToken={invitationToken} onViewPolicy={onViewPolicy} />
                )}
            </div>
        </div>
    );
};

export default AuthModal;