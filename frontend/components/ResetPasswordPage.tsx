import React, { useState, useEffect } from 'react';
import { resetPassword } from '../services/mockApi';
import Spinner from './Spinner';
import { View } from '../types';

interface ResetPasswordPageProps {
    navigateTo?: (view: View) => void;
}

const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ navigateTo }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const tokenFromUrl = urlParams.get('reset_token');
        const pathname = window.location.pathname;
        
        console.log('ResetPasswordPage - URL:', window.location.href);
        console.log('ResetPasswordPage - Pathname:', pathname);
        console.log('ResetPasswordPage - Reset Token:', tokenFromUrl);
        
        if (!tokenFromUrl) {
            setError('Invalid or missing reset token. Please request a new password reset.');
        } else {
            setToken(tokenFromUrl);
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters long');
            return;
        }

        if (!token) {
            setError('Invalid reset token');
            return;
        }

        setLoading(true);

        try {
            await resetPassword(token, newPassword);
            setSuccess('Password has been reset successfully! You can now sign in with your new password.');
            setTimeout(() => {
                if (navigateTo) {
                    navigateTo('LOGIN');
                } else {
                    window.location.href = '/';
                }
            }, 2000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full space-y-8">
                    <div className="text-center">
                        <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                            Invalid Reset Link
                        </h2>
                        <p className="mt-2 text-sm text-gray-600">
                            This password reset link is invalid or has expired.
                        </p>
                        <button
                            onClick={() => navigateTo ? navigateTo('LOGIN') : window.location.href = '/'}
                            className="mt-4 bg-teal-500 text-white px-4 py-2 rounded-md hover:bg-teal-600 transition-colors"
                        >
                            Back to Login
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Reset Your Password
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Enter your new password below
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    {error && (
                        <div className="bg-red-100 text-red-700 p-3 rounded-md text-sm">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="bg-green-100 text-green-700 p-3 rounded-md text-sm">
                            {success}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                                New Password
                            </label>
                            <input
                                id="newPassword"
                                name="newPassword"
                                type="password"
                                required
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-teal-500 focus:border-teal-500 focus:z-10 sm:text-sm"
                                placeholder="Enter new password"
                                disabled={loading || !!success}
                            />
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                                Confirm New Password
                            </label>
                            <input
                                id="confirmPassword"
                                name="confirmPassword"
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-teal-500 focus:border-teal-500 focus:z-10 sm:text-sm"
                                placeholder="Confirm new password"
                                disabled={loading || !!success}
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading || !!success}
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:bg-teal-300 disabled:cursor-not-allowed"
                        >
                            {loading ? <Spinner /> : 'Reset Password'}
                        </button>
                    </div>

                    <div className="text-center">
                        <button
                            type="button"
                            onClick={() => navigateTo ? navigateTo('LOGIN') : window.location.href = '/'}
                            className="text-teal-600 hover:text-teal-500 text-sm font-medium"
                        >
                            Back to Login
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ResetPasswordPage;
