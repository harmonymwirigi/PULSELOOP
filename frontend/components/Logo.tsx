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
                <img 
                    src="/logo.png" 
                    alt="PulseLoopCare Logo" 
                    className="w-10 h-10 object-contain drop-shadow-md"
                />
            </div>
            <h1 className={`text-2xl font-bold ${textColorClassName} drop-shadow-sm`}>PulseLoopCare</h1>
        </div>
    );
};

export default Logo;
