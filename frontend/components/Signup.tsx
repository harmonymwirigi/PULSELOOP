import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Spinner from './Spinner';
import { validateInvitationToken } from '../services/mockApi';

interface SignupProps {
    onSwitchToLogin: () => void;
    invitationToken?: string | null;
    onViewPolicy: () => void;
}

const Signup: React.FC<SignupProps> = ({ onSwitchToLogin, invitationToken, onViewPolicy }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [isEmailLocked, setIsEmailLocked] = useState(false);
    const { signup } = useAuth();

    useEffect(() => {
        const checkToken = async () => {
            if (invitationToken) {
                setLoading(true);
                try {
                    const { email: invitedEmail } = await validateInvitationToken(invitationToken);
                    setEmail(invitedEmail);
                    setIsEmailLocked(true);
                } catch (err: any) {
                    setError(err.message || 'Invalid invitation link.');
                } finally {
                    setLoading(false);
                }
            }
        };
        checkToken();
    }, [invitationToken]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);
        try {
            await signup(name, email, password, invitationToken || undefined);
            setSuccess('Registration successful! Please wait for an admin to approve your account. You can now close this window.');
            setName('');
            if (!isEmailLocked) setEmail('');
            setPassword('');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">Create Account</h2>
            {error && <p className="bg-red-100 text-red-700 p-3 rounded-md mb-4 text-sm">{error}</p>}
            {success && <p className="bg-green-100 text-green-700 p-3 rounded-md mb-4 text-sm">{success}</p>}
            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    <label className="block text-gray-700 font-medium mb-2" htmlFor="name">Full Name</label>
                    <input
                        type="text"
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                        required
                        disabled={!!success}
                    />
                </div>
                <div className="mb-4">
                    <label className="block text-gray-700 font-medium mb-2" htmlFor="email">Email</label>
                    <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-gray-100"
                        required
                        disabled={!!success || isEmailLocked}
                    />
                </div>
                <div className="mb-4">
                    <label className="block text-gray-700 font-medium mb-2" htmlFor="password">Password</label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                        required
                        disabled={!!success}
                    />
                </div>

                <div className="mb-6 flex items-start space-x-3">
                    <input
                        id="terms-agreement"
                        name="terms-agreement"
                        type="checkbox"
                        checked={agreedToTerms}
                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                        className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded mt-1"
                        disabled={!!success}
                    />
                    <div className="text-sm">
                        <label htmlFor="terms-agreement" className="text-gray-600">
                            I agree to the{' '}
                            <button type="button" onClick={onViewPolicy} className="font-medium text-teal-600 hover:underline">
                                Privacy Policy & Terms of Use
                            </button>
                            .
                        </label>
                    </div>
                </div>

                <button type="submit" disabled={loading || !!success || !agreedToTerms} className="w-full bg-teal-500 text-white py-2.5 rounded-md hover:bg-teal-600 transition-colors flex items-center justify-center disabled:bg-teal-300 disabled:cursor-not-allowed font-semibold">
                    {loading ? <Spinner /> : 'Sign Up'}
                </button>
            </form>
            <p className="text-center text-gray-600 mt-6">
                Already have an account? <button onClick={onSwitchToLogin} className="text-teal-600 hover:underline font-medium">Login</button>
            </p>
        </div>
    );
};

export default Signup;