import React from 'react';

interface LogoProps {
    textColorClassName?: string;
    onClick?: () => void;
}

const Logo: React.FC<LogoProps> = ({ textColorClassName = 'text-teal-600', onClick }) => {
    return (
        <div 
            className="flex items-center space-x-4 hover:scale-105 transition-transform duration-200 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg" 
            onClick={onClick} 
            style={{ cursor: onClick ? 'pointer' : 'default' }}
        >
            <div className="relative">
                {/* White background circle for the logo */}
                <div className="absolute inset-0 bg-white rounded-full shadow-lg"></div>
                <img 
                    src="/logo.jpg" 
                    alt="PulseLoopCare Logo" 
                    className="relative w-16 h-16 object-contain z-10 p-2"
                />
            </div>
            <h1 className={`text-3xl font-bold text-white drop-shadow-lg`}>PulseLoopCare</h1>
        </div>
    );
};

export default Logo;
