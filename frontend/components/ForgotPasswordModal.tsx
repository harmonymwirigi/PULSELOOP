import React, { useState } from 'react';
import { forgotPassword } from '../services/mockApi';
import Spinner from './Spinner';

interface ForgotPasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSwitchToLogin: () => void;
}

const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ isOpen, onClose, onSwitchToLogin }) => {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            await forgotPassword(email);
            setSuccess('If an account with that email exists, a password reset link has been sent to your email address.');
            setEmail('');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setEmail('');
        setError('');
        setSuccess('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">Reset Password</h2>
                    <button
                        onClick={handleClose}
                        className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                    >
                        ×
                    </button>
                </div>

                <p className="text-gray-600 mb-6">
                    Enter your email address and we'll send you a link to reset your password.
                </p>

                {error && (
                    <div className="bg-red-100 text-red-700 p-3 rounded-md mb-4 text-sm">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="bg-green-100 text-green-700 p-3 rounded-md mb-4 text-sm">
                        {success}
                    </div>
                )}

                <form onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()}>
                    <div className="mb-6">
                        <label className="block text-gray-700 font-medium mb-2" htmlFor="email">
                            Email Address
                        </label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                            placeholder="Enter your email address"
                            required
                            disabled={loading || !!success}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !!success}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full bg-teal-500 text-white py-2.5 rounded-md hover:bg-teal-600 transition-colors flex items-center justify-center disabled:bg-teal-300 disabled:cursor-not-allowed font-semibold"
                    >
                        {loading ? <Spinner /> : 'Send Reset Link'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-gray-600">
                        Remember your password?{' '}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onSwitchToLogin();
                            }}
                            className="text-teal-600 hover:underline font-medium"
                        >
                            Sign in
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordModal;
