import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Spinner from './Spinner';
import { validateInvitationToken } from '../services/mockApi';

interface SignupProps {
    onSwitchToLogin: () => void;
    invitationToken?: string | null;
    onViewPolicy: () => void;
}

const titleOptions = ['Dr', 'MD', 'DO', 'NP', 'DNP', 'Nurse', 'RN', 'BSN', 'MSN', 'LPN', 'LVN', 'CNA', 'CMA', 'PA', 'PTOP', 'PT', 'OT', 'PharmD', 'RPh', 'RT', 'RRT', 'EMT', 'Paramedic', 'MA', 'Other'];

const Signup: React.FC<SignupProps> = ({ onSwitchToLogin, invitationToken, onViewPolicy }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [title, setTitle] = useState('');
    const [customTitle, setCustomTitle] = useState('');
    const [state, setState] = useState('');
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [isEmailLocked, setIsEmailLocked] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
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
            const finalTitle = title === 'Other' ? customTitle : title;
            await signup(name, email, password, finalTitle || undefined, state || undefined, invitationToken || undefined);
            setSuccess('Registration successful! Please wait for an admin to approve your account. You can now close this window.');
            setName('');
            if (!isEmailLocked) setEmail('');
            setPassword('');
            setTitle('');
            setCustomTitle('');
            setState('');
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
                    <div className="relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                            required
                            disabled={!!success}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                            disabled={!!success}
                        >
                            {showPassword ? (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
                <div className="mb-4">
                    <label className="block text-gray-700 font-medium mb-2" htmlFor="title">Title</label>
                    <select
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                        required
                        disabled={!!success}
                    >
                        <option value="">Select a title</option>
                        {titleOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                    {title === 'Other' && (
                        <input
                            type="text"
                            placeholder="Enter your title"
                            value={customTitle}
                            onChange={(e) => setCustomTitle(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 mt-2"
                            required
                            disabled={!!success}
                        />
                    )}
                </div>
                <div className="mb-4">
                    <label className="block text-gray-700 font-medium mb-2" htmlFor="state">State/Country</label>
                    <input
                        type="text"
                        id="state"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        placeholder="e.g., California or USA"
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