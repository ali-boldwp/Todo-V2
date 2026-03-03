import React, { useMemo, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { getProjects } from '../services/core';
import { getTasks } from '../services/task';
import {
    LayoutDashboard,
    FolderKanban,
    Users,
    CheckSquare,
    LogOut,
    ChevronRight,
    LayoutGrid,
    ListTodo,
    Zap,
    Settings,
    Github,
    Briefcase,
    FileText,
    MessageCircle,
    BookText,
    Blocks,
    CalendarDays,
    Mail,
    Star,
    KeyRound,
} from 'lucide-react';
import Header from './Header';
import UserAvatar from './UserAvatar';

const RailItem = ({ icon: Icon, label, active, onClick }: { icon: any; label: string; active?: boolean; onClick?: () => void }) => (
    <button
        onClick={onClick}
        title={label}
        className={`w-[34px] h-[34px] rounded-lg flex items-center justify-center transition-colors ${active ? 'bg-[#eef1fe] text-[#4f6ef7]' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
    >
        <Icon size={16} strokeWidth={1.8} />
    </button>
);

const SidebarItem = ({ to, icon: Icon, label, exact, alert }: { to: string; icon: any; label: string; exact?: boolean; alert?: boolean }) => {
    const location = useLocation();
    const isActive = exact ? location.pathname === to : location.pathname === to || (to !== '/' && location.pathname.startsWith(`${to}/`));

    return (
        <Link
            to={to}
            className={`flex items-center gap-2.5 px-4 py-1.5 text-[13px] transition-colors ${isActive ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
        >
            <Icon size={15} className={alert ? 'text-red-500' : (isActive ? 'text-gray-600' : 'text-gray-400')} strokeWidth={1.9} />
            <span className={`truncate ${alert ? 'text-red-600 font-semibold' : ''}`}>{label}</span>
            {alert && <span className="ml-auto inline-block w-2 h-2 rounded-full bg-red-500" />}
        </Link>
    );
};

const SectionLabel = ({ label, onAdd }: { label: string; onAdd?: () => void }) => (
    <div className="px-4 py-2 mt-2 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.8px] text-gray-400 font-semibold">{label}</span>
        {onAdd && (
            <button
                onClick={onAdd}
                title={`Add ${label}`}
                className="text-gray-400 hover:text-gray-700 transition-colors text-base leading-none"
            >
                +
            </button>
        )}
    </div>
);

const PROJECT_SUB_ITEMS = [
    { label: 'Overview', path: 'overview', icon: LayoutGrid },
    { label: 'Tasks', path: 'tasks', icon: ListTodo },
    { label: 'Verifications', path: 'verifications', icon: CheckSquare },
    { label: 'Documents', path: 'documents', icon: FileText, adminOnly: false },
    { label: 'Access', path: 'access', icon: KeyRound, adminOnly: true },
    { label: 'Sprints', path: 'sprints', icon: Zap, adminOnly: false },
    { label: 'Settings', path: 'settings', icon: Settings, roleIn: ['admin', 'manager'] },
];

const ProjectItem = ({ project, isOpen, onToggle }: { project: any; isOpen: boolean; onToggle: () => void }) => {
    const location = useLocation();
    const { user } = useAuth();
    const { data: tasks = [] } = useQuery({
        queryKey: ['project-sidebar-verification-tasks', project._id],
        queryFn: () => getTasks(project._id),
        enabled: Boolean(project?._id),
    });
    const basePath = `/projects/${project._id}`;
    const isParentActive = location.pathname.startsWith(basePath);
    const myId = user?.id?.toString?.() || '';
    const projectPendingForMe = tasks.filter((task: any) => {
        const verifierId = task?.verifierId?._id?.toString?.() || task?.verifierId?.toString?.() || '';
        const isPendingVerification = task?.verificationStatus === 'pending' || task?.status === 'under_verification';
        return isPendingVerification && verifierId === myId;
    }).length;

    const visibleItems = PROJECT_SUB_ITEMS.filter((item: any) => {
        if (item.adminOnly && user?.role !== 'admin') return false;
        if (item.staffOnly && user?.role === 'client') return false;
        if (item.roleIn && !item.roleIn.includes(user?.role)) return false;
        return true;
    });

    return (
        <div>
            <button
                onClick={onToggle}
                className={`w-full flex items-center px-4 py-1.5 text-[13px] font-medium transition-colors ${isParentActive ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
            >
                <ChevronRight size={13} className={`mr-1.5 text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                <span className="truncate text-left">{project.name}</span>
            </button>

            {isOpen && (
                <div className="ml-8 border-l border-gray-200 pl-2 py-1">
                    {visibleItems.map((item) => {
                        const to = `${basePath}/${item.path}`;
                        const isActive = location.pathname === to || location.pathname.startsWith(`${to}/`);
                        return (
                            <Link
                                key={item.path}
                                to={to}
                                className={`flex items-center gap-2 px-2 py-1 text-[12.5px] transition-colors ${isActive ? 'text-[#4f6ef7] font-medium' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}
                            >
                                <item.icon size={13} strokeWidth={2} className={item.path === 'verifications' && projectPendingForMe > 0 ? 'text-red-500' : ''} />
                                <span className={item.path === 'verifications' && projectPendingForMe > 0 ? 'text-red-600 font-semibold' : ''}>{item.label}</span>
                                {item.path === 'verifications' && projectPendingForMe > 0 && (
                                    <span className="ml-auto inline-block min-w-[18px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold text-center">
                                        {projectPendingForMe}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const RightMiniAvatars = () => {
    const avatars = [
        { label: 'JD', bg: 'from-blue-500 to-indigo-500', online: false },
        { label: 'SR', bg: 'from-orange-500 to-amber-400', online: true },
        { label: 'MK', bg: 'from-violet-500 to-pink-500', online: false },
        { label: 'DL', bg: 'from-rose-500 to-orange-500', online: false },
        { label: 'MP', bg: 'from-emerald-500 to-cyan-500', online: true },
    ];

    return (
        <aside className="w-11 border-l border-gray-200 py-3 hidden xl:flex flex-col items-center gap-2 overflow-y-auto">
            {avatars.map((a, index) => (
                <div key={`${a.label}-${index}`} className="relative">
                    <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${a.bg} text-white text-[10px] font-bold flex items-center justify-center`}>
                        {a.label}
                    </div>
                    {a.online && <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-green-500 border border-white" />}
                </div>
            ))}
        </aside>
    );
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: getProjects });
    const { data: verificationTasks = [] } = useQuery({
        queryKey: ['sidebar-global-verification-tasks'],
        queryFn: () => getTasks(''),
        enabled: Boolean(user?.id),
    });
    const myPendingVerifications = verificationTasks.filter((task: any) => {
        const verifierId = task?.verifierId?._id?.toString?.() || task?.verifierId?.toString?.() || '';
        const isPendingVerification = task?.verificationStatus === 'pending' || task?.status === 'under_verification';
        return isPendingVerification && verifierId === user?.id;
    }).length;

    const activeProjectId = useMemo(() => {
        const match = location.pathname.match(/^\/projects\/([^/]+)/);
        return match ? match[1] : null;
    }, [location.pathname]);

    const [openProjectId, setOpenProjectId] = useState<string | null>(activeProjectId);

    useEffect(() => {
        if (activeProjectId) setOpenProjectId(activeProjectId);
    }, [activeProjectId]);

    return (
        <div className="flex h-screen bg-white">
            <div className="w-[52px] border-r border-gray-200 flex flex-col items-center py-[12px] gap-[2px] shrink-0">
                <div className="w-[30px] h-[30px] rounded-lg bg-[#4f6ef7] flex items-center justify-center mb-[14px]">
                    <FolderKanban size={15} className="text-white" strokeWidth={2} />
                </div>

                <RailItem icon={LayoutDashboard} label="Home" active={location.pathname === '/'} onClick={() => navigate('/')} />
                <RailItem icon={CalendarDays} label="Calendar" active={location.pathname.startsWith('/time')} onClick={() => navigate('/time')} />
                {user?.role !== 'client' && <RailItem icon={Mail} label="Messages" active={location.pathname.startsWith('/chat')} onClick={() => navigate('/chat')} />}
                {(user?.role === 'admin' || user?.role === 'manager') && <RailItem icon={Briefcase} label="Clients" active={location.pathname === '/clients'} onClick={() => navigate('/clients')} />}
                {user?.role === 'admin' && <RailItem icon={Users} label="Team" active={location.pathname === '/team'} onClick={() => navigate('/team')} />}
                <RailItem icon={Star} label="Projects" active={location.pathname.startsWith('/projects')} onClick={() => navigate('/projects')} />
                {user?.role === 'admin' && <RailItem icon={Github} label="GitHub" active={location.pathname === '/github'} onClick={() => navigate('/github')} />}

                <div className="mt-auto flex flex-col items-center gap-2">
                    <RailItem icon={LogOut} label="Logout" onClick={logout} />
                    <UserAvatar firstName={user?.firstName} lastName={user?.lastName} email={user?.email} profileImageUrl={user?.profileImageUrl} sizeClassName="w-7 h-7" textClassName="text-[10px]" />
                </div>
            </div>

            <aside className="w-[230px] border-r border-gray-200 flex flex-col shrink-0 overflow-hidden">
                <div className="px-4 pt-[13px] pb-[10px] border-b border-gray-200">
                    <p className="text-[13px] font-bold text-[#4f6ef7]">DevRegion</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Custom project management</p>
                </div>

                <div className="flex-1 overflow-y-auto py-2">
                    <div className="px-3 mb-3">
                        <button className="w-full bg-white border border-gray-200 rounded-md px-3 py-1.5 flex items-center gap-2 text-gray-700 hover:border-gray-300 transition-all shadow-sm text-[13px] font-medium">
                            <span className="w-4 h-4 rounded-full bg-[#4f6ef7] text-white text-[10px] flex items-center justify-center">+</span>
                            <span>New work item</span>
                        </button>
                    </div>

                    <SidebarItem to="/" icon={LayoutDashboard} label="Home" exact />
                    <SidebarItem to="/verifications" icon={CheckSquare} label="Verifications" alert={myPendingVerifications > 0} />
                    {user?.role !== 'client' && <SidebarItem to="/chat" icon={MessageCircle} label="Chat" />}

                    <SectionLabel label="Projects" onAdd={() => navigate('/projects?action=create')} />
                    <div className="space-y-0.5">
                        {projects.map((project: any) => (
                            <ProjectItem
                                key={project._id}
                                project={project}
                                isOpen={openProjectId === project._id}
                                onToggle={() => setOpenProjectId((prev) => (prev === project._id ? null : project._id))}
                            />
                        ))}
                    </div>
                </div>

                <div className="border-t border-gray-200 p-3 flex items-center gap-2.5">
                    <UserAvatar firstName={user?.firstName} lastName={user?.lastName} email={user?.email} profileImageUrl={user?.profileImageUrl} sizeClassName="w-7 h-7" textClassName="text-[10px]" />
                    <div>
                        <p className="text-[12px] font-medium text-gray-700 leading-none">{[user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'User'}</p>
                        <p className="text-[10.5px] text-gray-400 mt-1 capitalize">{user?.role || 'member'}</p>
                    </div>
                </div>
            </aside>

            <div className="flex-1 min-w-0 flex flex-col bg-white">
                <Header />
                <div className="flex-1 min-h-0 flex">
                    <main className="flex-1 overflow-auto pb-16">{children}</main>
                    <RightMiniAvatars />
                </div>
                <div className="fixed bottom-0 left-[282px] right-0 xl:right-11 h-12 border-t border-gray-200 px-5 flex items-center gap-2 bg-white z-20">
                    <button className="h-8 px-3 rounded-md bg-[#4f6ef7] text-white text-[12.5px] font-semibold hover:bg-[#3a56e0] transition-colors shadow-sm shadow-[#4f6ef7]/30 flex items-center gap-1.5">
                        <Blocks size={13} />
                        {projects.find((p: any) => p._id === activeProjectId)?.name || 'FreshImpact V3'}
                    </button>
                    <button className="h-8 px-3 rounded-md border border-gray-200 text-gray-700 text-[12.5px] font-semibold hover:bg-gray-50 transition-colors flex items-center gap-1.5">
                        <BookText size={13} />
                        Documentation
                    </button>
                    <div className="ml-auto flex items-center gap-1.5">
                        <span className="w-6 h-6 rounded-md bg-sky-400 text-white text-[9px] font-bold flex items-center justify-center">R</span>
                        <span className="w-6 h-6 rounded-md bg-[#4f6ef7] text-white text-[9px] font-bold flex items-center justify-center">TS</span>
                        <span className="w-6 h-6 rounded-md bg-emerald-500 text-white text-[9px] font-bold flex items-center justify-center">N</span>
                        <span className="w-6 h-6 rounded-md bg-orange-500 text-white text-[9px] font-bold flex items-center justify-center">F</span>
                        <span className="w-6 h-6 rounded-md bg-violet-500 text-white text-[9px] font-bold flex items-center justify-center">V</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Layout;
