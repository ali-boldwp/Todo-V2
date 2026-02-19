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

import { getProjects } from '../services/core';
import { useQuery } from '@tanstack/react-query';

const SidebarRailItem = ({ icon: Icon, label, active }: { icon: any; label: string; active?: boolean }) => (
    <div className={`w-10 h-10 flex items-center justify-center rounded-lg mb-2 cursor-pointer transition-colors group relative ${active ? 'bg-gray-200 text-gray-900' : 'text-gray-500 hover:bg-gray-200 hover:text-gray-900'}`}>
        <Icon size={20} strokeWidth={1.5} />
        <div className="absolute left-12 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
            {label}
        </div>
    </div>
);

const SidebarItem = ({ to, icon: Icon, label, alert }: { to: string; icon: any; label: string; alert?: boolean }) => {
    const location = useLocation();
    const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));

    return (
        <Link
            to={to}
            className={`flex items-center px-3 py-1.5 rounded-md transition-colors text-[13px] font-medium ${isActive
                ? 'bg-[#EAEBEB] text-gray-900'
                : 'text-gray-600 hover:bg-[#EAEBEB] hover:text-gray-900'
                }`}
        >
            {Icon && <Icon size={16} className="mr-3 text-gray-500" strokeWidth={2} />}
            <span className="flex-1 truncate">{label}</span>
        </Link>
    );
};

const SectionHeader = ({ label, plus }: { label: string; plus?: boolean }) => (
    <div className="px-3 py-2 flex items-center justify-between text-xs font-medium text-gray-500 hover:text-gray-700 cursor-pointer group mt-4">
        <span className="flex items-center">
            {/* Chevron placeholder */}
            <span className="mr-1 opacity-0 group-hover:opacity-100 transition-opacity">▼</span>
            {label}
        </span>
        {plus && <span className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-900">+</span>}
    </div>
);

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: getProjects });

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="flex h-screen bg-white">
            {/* 1. Icon Rail (Leftmost) */}
            <div className="w-[56px] bg-[#F7F8FA] border-r border-gray-200 flex flex-col items-center py-4 z-20">
                <SidebarRailItem icon={FolderKanban} label="Projects" active />
                <SidebarRailItem icon={Users} label="Team" />
                <SidebarRailItem icon={CheckSquare} label="My Work" />
                <div className="mt-auto flex flex-col items-center space-y-2">
                    <SidebarRailItem icon={LogOut} label="Logout" />
                    <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold cursor-pointer">
                        {user?.email?.[0].toUpperCase()}
                    </div>
                </div>
            </div>

            {/* 2. Context Sidebar (Panel) */}
            <div className="w-[240px] bg-[#F7F8FA] border-r border-gray-200 flex flex-col z-10">
                {/* Workspace Switcher */}
                <div className="h-14 flex items-center px-4 border-b border-gray-100 hover:bg-gray-200/50 cursor-pointer transition-colors">
                    <div className="w-5 h-5 bg-gray-900 rounded flex items-center justify-center text-white text-[10px] font-bold mr-2">
                        D
                    </div>
                    <span className="text-sm font-semibold text-gray-900 flex-1">DevRegion</span>
                    <span className="text-gray-400 text-[10px]">▼</span>
                </div>

                {/* Main Nav */}
                <div className="flex-1 overflow-y-auto py-4 px-2">
                    {/* New Item Button */}
                    <div className="mb-6 px-1">
                        <button className="w-full flex items-center space-x-2 bg-white border border-gray-200 shadow-sm text-gray-700 px-3 py-1.5 rounded-md hover:border-gray-300 hover:shadow transition-all text-[13px] font-medium">
                            <div className="w-4 h-4 bg-indigo-600 rounded-full flex items-center justify-center text-white text-[10px]">+</div>
                            <span>New work item</span>
                        </button>
                    </div>

                    <SidebarItem to="/" icon={LayoutDashboard} label="Home" />
                    <SidebarItem to="/tasks" icon={CheckSquare} label="Your work" />

                    <div className="pt-2">
                        <SectionHeader label="Workspace" />
                        <div className="space-y-0.5">
                            {user?.role !== 'client' && (
                                <>
                                    <SidebarItem to="/clients" icon={Users} label="Clients" />
                                    <SidebarItem to="/time" icon={Clock} label="Time Tracking" />
                                    <SidebarItem to="/attendance" icon={CalendarDays} label="Attendance" />
                                    <SidebarItem to="/payroll" icon={Banknote} label="Payroll" />
                                    <SidebarItem to="/github" icon={Github} label="GitHub" />
                                </>
                            )}
                            <SidebarItem to="/projects" icon={FolderKanban} label="All Projects" />
                        </div>
                    </div>

                    <div className="pt-2">
                        <SectionHeader label="Projects" plus />
                        <div className="space-y-0.5">
                            {projects?.slice(0, 5).map((project: any) => (
                                <Link
                                    key={project._id}
                                    to={`/projects/${project._id}`}
                                    className="flex items-center px-3 py-1.5 rounded-md text-gray-600 hover:bg-[#EAEBEB] hover:text-gray-900 text-[13px] transition-colors"
                                >
                                    <span className="w-1.5 h-1.5 rounded bg-gray-400 mr-3 flex-shrink-0"></span>
                                    <span className="truncate">{project.name}</span>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Main Content */}
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
