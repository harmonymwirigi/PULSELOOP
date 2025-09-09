import React, { useState } from 'react';
import { sendInvitation } from '../services/mockApi';
import Spinner from './Spinner';

interface InviteModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const InviteModal: React.FC<InviteModalProps> = ({ isOpen, onClose }) => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMessage(null);
        try {
            const response = await sendInvitation(email);
            setSuccessMessage(response.message);
            setEmail('');
        } catch (err: any) {
            setError(err.message || 'Failed to send invitation.');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        // Reset state on close
        setEmail('');
        setError(null);
        setSuccessMessage(null);
        setLoading(false);
        onClose();
    };

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" 
            onClick={handleClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="invite-modal-title"
        >
            <div 
                className="bg-white p-6 rounded-lg shadow-2xl w-full max-w-md relative" 
                onClick={(e) => e.stopPropagation()}
            >
                <h2 id="invite-modal-title" className="text-2xl font-bold text-gray-800 mb-4">Invite a Colleague</h2>
                <p className="text-gray-600 mb-6">Enter the email address of the healthcare professional you'd like to invite to PulseLoopCare.</p>
                
                {error && <p className="bg-red-100 text-red-700 p-3 rounded-md mb-4 text-sm">{error}</p>}
                {successMessage && <p className="bg-green-100 text-green-700 p-3 rounded-md mb-4 text-sm">{successMessage}</p>}

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label htmlFor="invite-email" className="block text-gray-700 font-medium mb-2">Email Address</label>
                        <input
                            type="email"
                            id="invite-email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                            required
                            placeholder="colleague@example.com"
                        />
                    </div>
                    <div className="flex justify-end space-x-3 mt-6">
                        <button type="button" onClick={handleClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-semibold">
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={loading || !email}
                            className="px-6 py-2 bg-teal-500 text-white rounded-md hover:bg-teal-600 disabled:bg-teal-300 disabled:cursor-not-allowed flex items-center justify-center w-40 font-semibold"
                        >
                            {loading ? <Spinner /> : 'Send Invitation'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default InviteModal;