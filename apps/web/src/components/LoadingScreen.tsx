import React from 'react';
import icon from '../assets/icon.png';

const LoadingScreen: React.FC = () => {
    return (
        <div className="fixed inset-0 bg-[#050505] flex items-center justify-center z-[9999]">
            <div className="flex flex-col items-center">
                {/* Logo with a soft pulsing effect */}
                <div className="relative">
                    <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full animate-pulse"></div>
                    <img
                        src={icon}
                        alt="DevRegion Icon"
                        className="relative w-32 h-auto animate-pulse object-contain drop-shadow-2xl"
                    />
                </div>

                {/* Minimalist animated loading dots */}
                <div className="mt-12 flex space-x-3">
                    <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
            </div>
        </div>
    );
};

export default LoadingScreen;
