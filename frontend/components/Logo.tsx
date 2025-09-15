import React from 'react';

interface LogoProps {
    textColorClassName?: string;
    onClick?: () => void;
}

const Logo: React.FC<LogoProps> = ({ textColorClassName = 'text-teal-600', onClick }) => {
    return (
        <div 
            className="flex items-center space-x-4 hover:scale-105 transition-transform duration-200 bg-gradient-to-r from-indigo-800/90 to-purple-800/90 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg border border-indigo-300/30" 
            onClick={onClick} 
            style={{ cursor: onClick ? 'pointer' : 'default' }}
        >
            <div className="relative w-16 h-16">
                {/* Dark background circle for better contrast */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900 rounded-full shadow-lg border-2 border-white/20"></div>
                <img 
                    src="/logo.jpg" 
                    alt="PulseLoopCare Logo" 
                    className="absolute inset-0 w-full h-full object-cover rounded-full z-10 p-2"
                />
            </div>
            <h1 className={`text-3xl font-bold text-white drop-shadow-lg`}>PulseLoopCare</h1>
        </div>
    );
};

export default Logo;
