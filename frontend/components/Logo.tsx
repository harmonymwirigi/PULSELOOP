import React from 'react';

interface LogoProps {
    textColorClassName?: string;
    onClick?: () => void;
}

const Logo: React.FC<LogoProps> = ({ textColorClassName = 'text-teal-600', onClick }) => {
    return (
        <div 
            className="flex items-center space-x-3 hover:scale-105 transition-transform duration-200" 
            onClick={onClick} 
            style={{ cursor: onClick ? 'pointer' : 'default' }}
        >
            <div className="relative">
                {/* White background circle for better visibility */}
                <div className="absolute inset-0 bg-white rounded-full shadow-lg"></div>
                <img 
                    src="/logo.png" 
                    alt="PulseLoopCare Logo" 
                    className="relative w-10 h-10 object-contain z-10 p-1"
                />
            </div>
            <h1 className={`text-2xl font-bold ${textColorClassName} drop-shadow-lg`}>PulseLoopCare</h1>
        </div>
    );
};

export default Logo;
