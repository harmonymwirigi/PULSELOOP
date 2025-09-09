import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { login as apiLogin, signup as apiSignup } from '../services/mockApi';

interface AuthContextType {
    user: User | null;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    signup: (name: string, email: string, password: string, invitationToken?: string) => Promise<void>;
    updateUser: (updatedUser: User) => void;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkUser = () => {
            try {
                const storedToken = localStorage.getItem('accessToken');
                const storedUser = localStorage.getItem('user');
                if (storedToken && storedUser) {
                    setUser(JSON.parse(storedUser));
                }
            } catch (error) {
                console.error("Failed to parse user from localStorage", error);
                localStorage.removeItem('user');
                localStorage.removeItem('accessToken');
            } finally {
                setLoading(false);
            }
        };
        checkUser();
    }, []);

    const login = async (email: string, password: string) => {
        const { accessToken, user: loggedInUser } = await apiLogin(email, password);
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('user', JSON.stringify(loggedInUser));
        setUser(loggedInUser);
    };

    const logout = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        setUser(null);
    };

    const signup = async (name: string, email: string, password: string, invitationToken?: string) => {
        await apiSignup(name, email, password, invitationToken);
    };

    const updateUser = (updatedUser: User) => {
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, signup, updateUser, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};