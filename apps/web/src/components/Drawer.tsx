import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';

interface DrawerProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
}

const Drawer: React.FC<DrawerProps> = ({ isOpen, onClose, title, children, size = 'lg' }) => {
    const [isVisible, setIsVisible] = useState(false);

    const sizeClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
        '3xl': 'max-w-3xl',
    };

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
        } else {
            const timer = setTimeout(() => setIsVisible(false), 300); // Wait for animation
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!isVisible && !isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <div
                className={clsx(
                    "fixed inset-0 bg-black/10 backdrop-blur-[2px] transition-opacity duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />

            {/* Drawer */}
            <div
                className={clsx(
                    "relative w-full bg-white h-full shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] transform border-l border-gray-100",
                    sizeClasses[size],
                    isOpen ? "translate-x-0" : "translate-x-full"
                )}
            >
                <div className="flex items-center justify-between p-4 border-b border-gray-50">
                    <div className="flex items-center space-x-2 text-xs font-bold text-gray-400 uppercase tracking-widest px-2">
                        {title}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-gray-100 rounded-md transition-all text-gray-400 hover:text-gray-900"
                    >
                        <X size={20} strokeWidth={2} />
                    </button>
                </div>
                <div className="p-6 h-[calc(100vh-80px)] overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Drawer;
