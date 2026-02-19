import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard,
    FolderKanban,
    Users,
    CheckSquare,
    Clock,
    LogOut,
    CalendarDays,
    Banknote,
    Github
} from 'lucide-react';
import Header from './Header';

const SidebarItem = ({ to, icon: Icon, label, alert }: { to: string; icon: any; label: string; alert?: boolean }) => {
    const location = useLocation();
    const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));

    return (
        <Link
            to={to}
            className={`flex items-center justify-between px-3 py-1.5 rounded-md transition-all group ${isActive
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                }`}
        >
            <div className="flex items-center space-x-3">
                <Icon size={16} className={isActive ? 'text-gray-900' : 'text-gray-500 group-hover:text-gray-900'} />
                <span className="text-sm font-medium">{label}</span>
            </div>
            {alert && <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>}
        </Link>
    );
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="flex h-screen bg-[#F7F8FA]">
            {/* Sidebar */}
            <div className="w-[240px] bg-[#F7F8FA] border-r border-gray-200 flex flex-col pt-3 pb-4">
                {/* Logo / Workspace Switcher */}
                <div className="px-4 mb-6">
                    <div className="flex items-center space-x-2 px-2 py-1.5 hover:bg-gray-200/50 rounded-lg cursor-pointer transition-colors">
                        <img src="/logo.png" alt="DevRegion" className="w-6 h-6 rounded" />
                        <span className="text-sm font-semibold text-gray-900">DevRegion</span>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-2 space-y-6 overflow-y-auto">
                    {/* Primary Section */}
                    <div className="space-y-0.5">
                        <div className="px-3 py-1 text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Overview</div>
                        <SidebarItem to="/" icon={LayoutDashboard} label="Dashboard" />
                        <SidebarItem to="/projects" icon={FolderKanban} label="Projects" />
                        <SidebarItem to="/tasks" icon={CheckSquare} label="My Issues" />
                    </div>

                    {user?.role !== 'client' && (
                        <div className="space-y-0.5">
                            <div className="px-3 py-1 text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Workspace</div>
                            <SidebarItem to="/clients" icon={Users} label="Clients" />
                            <SidebarItem to="/time" icon={Clock} label="Time Tracking" />
                            <SidebarItem to="/attendance" icon={CalendarDays} label="Attendance" />
                            <SidebarItem to="/payroll" icon={Banknote} label="Payroll" />
                            <SidebarItem to="/github" icon={Github} label="GitHub" />
                        </div>
                    )}
                </nav>

                {/* User Section */}
                <div className="px-3 mt-auto">
                    <div className="border-t border-gray-200 pt-3">
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center space-x-3 px-3 py-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        >
                            <LogOut size={16} />
                            <span className="text-sm font-medium">Log out</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-white">
                <Header />
                <main className="flex-1 overflow-auto p-0">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default Layout;
