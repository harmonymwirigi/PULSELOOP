import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Spinner from './Spinner';

interface LoginProps {
    onSwitchToSignup: () => void;
}

const Login: React.FC<LoginProps> = ({ onSwitchToSignup }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password);
            // App component will handle navigation on user state change
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h2 className="text-3xl font-bold text-center text-gray-800 mb-2">Welcome Back</h2>
             <p className="text-center text-gray-500 mb-6">
                Log in to access the platform.
            </p>
            {error && <p className="bg-red-100 text-red-700 p-3 rounded-md mb-4 text-sm">{error}</p>}
            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    <label className="block text-gray-700 font-medium mb-2" htmlFor="email">Email</label>
                    <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                        required
                    />
                </div>
                <div className="mb-6">
                    <label className="block text-gray-700 font-medium mb-2" htmlFor="password">Password</label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                        required
                    />
                </div>
                <button type="submit" disabled={loading} className="w-full bg-teal-500 text-white py-2.5 rounded-md hover:bg-teal-600 transition-colors flex items-center justify-center disabled:bg-teal-300 font-semibold">
                    {loading ? <Spinner /> : 'Login'}
                </button>
            </form>
            <p className="text-center text-gray-600 mt-6">
                Don't have an account? <button onClick={onSwitchToSignup} className="text-teal-600 hover:underline font-medium">Sign up</button>
            </p>
        </div>
    );
};

export default Login;