import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { getProjects } from '../services/core';
import {
    LayoutDashboard,
    FolderKanban,
    Users,
    CheckSquare,
    LogOut,
    ChevronRight,
    LayoutGrid,
    Layers,
    Zap,
    Settings,
} from 'lucide-react';
import Header from './Header';

const SidebarRailItem = ({ icon: Icon, label, active }: { icon: any; label: string; active?: boolean }) => (
    <div className={`w-10 h-10 flex items-center justify-center rounded-lg mb-2 cursor-pointer transition-colors group relative ${active ? 'bg-gray-200 text-gray-900' : 'text-gray-500 hover:bg-gray-200 hover:text-gray-900'}`}>
        <Icon size={20} strokeWidth={1.5} />
        <div className="absolute left-12 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
            {label}
        </div>
    </div>
);

const SidebarItem = ({ to, icon: Icon, label }: { to: string; icon: any; label: string }) => {
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
            <span className="mr-1 opacity-0 group-hover:opacity-100 transition-opacity">▼</span>
            {label}
        </span>
        {plus && <span className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-900">+</span>}
    </div>
);

const PROJECT_SUB_ITEMS = [
    { label: 'Overview', path: 'overview', icon: LayoutGrid },
    { label: 'Board', path: 'board', icon: Layers },
    { label: 'Backlog', path: 'backlog', icon: CheckSquare },
    { label: 'Sprints', path: 'sprints', icon: Zap },
    { label: 'Settings', path: 'settings', icon: Settings },
];

const ProjectNavItem = ({
    project,
    isOpen,
    onToggle,
}: {
    project: any;
    isOpen: boolean;
    onToggle: () => void;
}) => {
    const location = useLocation();
    const basePath = `/projects/${project._id}`;
    const isParentActive = location.pathname.startsWith(basePath);

    return (
        <div>
            {/* Project row */}
            <button
                onClick={onToggle}
                className={`w-full flex items-center px-3 py-1.5 rounded-md transition-colors text-[13px] font-medium group ${isParentActive
                    ? 'bg-[#EAEBEB] text-gray-900'
                    : 'text-gray-600 hover:bg-[#EAEBEB] hover:text-gray-900'
                    }`}
            >
                <ChevronRight
                    size={14}
                    className={`mr-1.5 text-gray-400 transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-90' : ''}`}
                />
                <span className="flex-1 truncate text-left">{project.name}</span>
            </button>

            {/* Sub-menu */}
            {isOpen && (
                <div className="ml-4 mt-0.5 space-y-0.5 border-l border-gray-200 pl-2">
                    {PROJECT_SUB_ITEMS.map((item) => {
                        const to = `${basePath}/${item.path}`;
                        const isActive = location.pathname === to || location.pathname.startsWith(to);
                        return (
                            <Link
                                key={item.path}
                                to={to}
                                className={`flex items-center px-2 py-1 rounded-md transition-colors text-[12px] font-medium ${isActive
                                    ? 'bg-[#EAEBEB] text-gray-900'
                                    : 'text-gray-500 hover:bg-[#EAEBEB] hover:text-gray-800'
                                    }`}
                            >
                                <item.icon size={13} className="mr-2 flex-shrink-0" strokeWidth={2} />
                                <span className="truncate">{item.label}</span>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [openProjectId, setOpenProjectId] = useState<string | null>(null);

    const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: getProjects });

    const handleProjectToggle = (id: string) => {
        setOpenProjectId(prev => (prev === id ? null : id));
    };

    return (
        <div className="flex h-screen bg-white">
            {/* 1. Icon Rail */}
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

            {/* 2. Context Sidebar */}
            <div className="w-[240px] bg-[#F7F8FA] border-r border-gray-200 flex flex-col z-10">
                {/* Workspace Switcher */}
                <div className="h-14 flex items-center px-4 border-b border-gray-100 hover:bg-gray-200/50 cursor-pointer transition-colors">
                    <div className="w-5 h-5 bg-gray-900 rounded flex items-center justify-center text-white text-[10px] font-bold mr-2">D</div>
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
                        <SectionHeader label="Projects" />
                        <div className="space-y-0.5">
                            <SidebarItem to="/projects" icon={FolderKanban} label="All Projects" />

                            {/* Existing projects */}
                            {projects?.map((project: any) => (
                                <ProjectNavItem
                                    key={project._id}
                                    project={project}
                                    isOpen={openProjectId === project._id}
                                    onToggle={() => handleProjectToggle(project._id)}
                                />
                            ))}

                            <button
                                onClick={() => navigate('/projects?action=create')}
                                className="w-full flex items-center px-3 py-1.5 rounded-md transition-colors text-[13px] font-medium text-gray-600 hover:bg-[#EAEBEB] hover:text-gray-900"
                            >
                                <span className="mr-3 text-gray-500 font-bold text-lg leading-none flex items-center justify-center w-4">+</span>
                                <span className="flex-1 truncate">New Project</span>
                            </button>
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
