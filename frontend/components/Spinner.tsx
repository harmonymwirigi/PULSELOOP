import React from 'react';

interface SpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    color?: 'white' | 'teal';
}

const Spinner: React.FC<SpinnerProps> = ({ size = 'sm', color = 'white' }) => {
    const sizeClasses = {
        sm: 'w-5 h-5',
        md: 'w-8 h-8',
        lg: 'w-12 h-12',
    };
    const colorClasses = {
        white: 'border-white',
        teal: 'border-teal-500'
    }
    return (
        <div className={`${sizeClasses[size]} border-t-2 border-b-2 ${colorClasses[color]} rounded-full animate-spin`}></div>
    );
};

export default Spinner;