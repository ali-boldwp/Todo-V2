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
                    "fixed inset-0 bg-black/50 transition-opacity duration-300 ease-in-out",
                    isOpen ? "opacity-100" : "opacity-0"
                )}
                onClick={onClose}
            />

            {/* Drawer */}
            <div
                className={clsx(
                    "relative w-full max-w-md bg-white h-full shadow-xl transition-transform duration-300 ease-in-out transform",
                    isOpen ? "translate-x-0" : "translate-x-full"
                )}
            >
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-xl font-semibold">{title}</h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>
                <div className="p-4 h-[calc(100vh-64px)] overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Drawer;
