import React from 'react';
import {
    Bell,
    Calendar,
    Maximize,
    MenuSquare,
    MessageSquare,
    Search,
    Star,
    Sun,
    Users,
} from 'lucide-react';

const IconBtn = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <button
        title={title}
        className="w-[30px] h-[30px] rounded-md flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
    >
        {children}
    </button>
);

const Header: React.FC = () => {
    return (
        <header className="h-12 border-b border-gray-200 px-5 flex items-center gap-1 shrink-0 bg-white">
            <IconBtn title="Menu">
                <MenuSquare size={15} strokeWidth={1.8} />
            </IconBtn>
            <IconBtn title="Calendar">
                <Calendar size={15} strokeWidth={1.8} />
            </IconBtn>
            <IconBtn title="Messages">
                <MessageSquare size={15} strokeWidth={1.8} />
            </IconBtn>
            <IconBtn title="Team">
                <Users size={15} strokeWidth={1.8} />
            </IconBtn>
            <IconBtn title="Star">
                <Star size={15} strokeWidth={1.8} />
            </IconBtn>

            <div className="w-px h-5 bg-gray-200 mx-1" />
            <div className="flex-1" />

            <button className="px-2 py-1 rounded-md text-xs text-gray-600 hover:bg-gray-100 transition-colors">EN</button>

            <IconBtn title="Theme">
                <Sun size={15} strokeWidth={1.8} />
            </IconBtn>
            <IconBtn title="Fullscreen">
                <Maximize size={15} strokeWidth={1.8} />
            </IconBtn>
            <IconBtn title="Search">
                <Search size={15} strokeWidth={1.8} />
            </IconBtn>

            <button title="Notifications" className="relative w-[30px] h-[30px] rounded-md flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <Bell size={15} strokeWidth={1.8} />
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#4f6ef7] border border-white" />
            </button>
        </header>
    );
};

export default Header;
