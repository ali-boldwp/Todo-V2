import React from 'react';
import { Search, Bell, HelpCircle, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Header: React.FC = () => {
    const { user } = useAuth();

    return (
        <header className="h-14 border-b border-gray-100 bg-white flex items-center justify-between px-4 sticky top-0 z-10">
            {/* Left: Breadcrumbs / Context */}
            <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span className="font-medium text-gray-900">Acme Inc.</span>
                <span className="text-gray-300">/</span>
                <span className="hover:text-gray-900 cursor-pointer">Projects</span>
            </div>

            {/* Center: Search */}
            <div className="flex-1 max-w-xl mx-4">
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-gray-600" />
                    <input
                        type="text"
                        placeholder="Search..."
                        className="w-full bg-gray-50 border border-transparent rounded-lg py-1.5 pl-9 pr-4 text-sm text-gray-900 placeholder-gray-500 focus:bg-white focus:border-gray-200 focus:ring-0 focus:outline-none transition-all"
                    />
                </div>
            </div>

            {/* Right: Actions & Profile */}
            <div className="flex items-center space-x-3">
                <button className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-md transition-colors">
                    <Bell className="w-4 h-4" />
                </button>
                <button className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-md transition-colors">
                    <HelpCircle className="w-4 h-4" />
                </button>

                <div className="w-px h-6 bg-gray-200 mx-2"></div>

                <div className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded-md transition-colors">
                    <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 text-xs font-medium">
                        {user?.email?.[0].toUpperCase() || <User size={14} />}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
