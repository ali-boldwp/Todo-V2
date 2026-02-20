import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';

interface DrawerProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

const Drawer: React.FC<DrawerProps> = ({ isOpen, onClose, title, children }) => {
    const [isVisible, setIsVisible] = useState(false);

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
                    "fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />

            {/* Drawer */}
            <div
                className={clsx(
                    "relative w-full max-w-lg bg-white/90 backdrop-blur-xl h-full shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] transform border-l border-white/20",
                    isOpen ? "translate-x-0" : "translate-x-full"
                )}
            >
                <div className="flex items-center justify-between p-6 border-b border-gray-100/50">
                    <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">{title}</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100/50 rounded-full transition-colors text-gray-500 hover:text-gray-900"
                    >
                        <X size={24} strokeWidth={1.5} />
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
