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
    Rocket,
    Briefcase,
    FileText,
    MessageCircle,
    BookText,
    Blocks,
    CalendarDays,
    Mail,
    Star,
    KeyRound,
    Download,
    Terminal,
    GripHorizontal,
} from 'lucide-react';
import Header from './Header';
import UserAvatar from './UserAvatar';

const RailItem = ({ icon: Icon, label, active, onClick }: { icon: any; label: string; active?: boolean; onClick?: () => void }) => (
    <button
        onClick={onClick}
        title={label}
        className={`w-[33px] h-[33px] rounded-[8px] flex items-center justify-center transition-colors ${active ? 'bg-[#2b3a4b] text-[#75d8e8]' : 'text-[#7f8da0] hover:text-[#d7e2ef] hover:bg-[#273343]'}`}
    >
        <Icon size={15} strokeWidth={1.9} />
    </button>
);

const SidebarItem = ({ to, icon: Icon, label, exact, alert }: { to: string; icon: any; label: string; exact?: boolean; alert?: boolean }) => {
    const location = useLocation();
    const isActive = exact ? location.pathname === to : location.pathname === to || (to !== '/' && location.pathname.startsWith(`${to}/`));

    return (
        <Link
            to={to}
            className={`flex items-center gap-2.5 px-4 py-1.5 text-[13px] transition-colors ${isActive ? 'bg-[#2e3a4b] text-[#d7e2ef] font-medium' : 'text-[#95a2b4] hover:bg-[#2a3341] hover:text-[#d7e2ef]'}`}
        >
            <Icon size={15} className={alert ? 'text-red-400' : (isActive ? 'text-[#8fd6e3]' : 'text-[#738398]')} strokeWidth={1.9} />
            <span className={`truncate ${alert ? 'text-red-600 font-semibold' : ''}`}>{label}</span>
            {alert && <span className="ml-auto inline-block w-2 h-2 rounded-full bg-red-500" />}
        </Link>
    );
};

const SectionLabel = ({ label, onAdd }: { label: string; onAdd?: () => void }) => (
    <div className="px-4 py-2 mt-2 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.8px] text-[#6f8095] font-semibold">{label}</span>
        {onAdd && (
            <button
                onClick={onAdd}
                title={`Add ${label}`}
                className="text-[#7e90a6] hover:text-[#d7e2ef] transition-colors text-base leading-none"
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
                className={`w-full flex items-center px-4 py-1.5 text-[13px] font-medium transition-colors ${isParentActive ? 'bg-[#2e3a4b] text-[#d7e2ef]' : 'text-[#95a2b4] hover:bg-[#2a3341] hover:text-[#d7e2ef]'}`}
            >
                <ChevronRight size={13} className={`mr-1.5 text-[#6d7f95] transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                <span className="truncate text-left">{project.name}</span>
            </button>

            {isOpen && (
                <div className="ml-8 border-l border-[#334255] pl-2 py-1">
                    {visibleItems.map((item) => {
                        const to = `${basePath}/${item.path}`;
                        const isActive = location.pathname === to || location.pathname.startsWith(`${to}/`);
                        return (
                            <Link
                                key={item.path}
                                to={to}
                                className={`flex items-center gap-2 px-2 py-1 text-[12.5px] transition-colors ${isActive ? 'text-[#75d8e8] font-medium' : 'text-[#8595aa] hover:text-[#d7e2ef] hover:bg-[#2a3341]'}`}
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
        <aside className="w-11 border-l border-[#2d3948] bg-[#1f2734] py-3 hidden xl:flex flex-col items-center gap-2 overflow-y-auto">
            {avatars.map((a, index) => (
                <div key={`${a.label}-${index}`} className="relative">
                    <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${a.bg} text-white text-[10px] font-bold flex items-center justify-center`}>
                        {a.label}
                    </div>
                    {a.online && <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-green-500 border border-[#1f2734]" />}
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
        <div className="flex h-screen bg-[#111923] text-[#d7e2ef]">
            <div className="w-[48px] border-r border-[#2a3645] bg-[#182230] flex flex-col items-center py-[9px] gap-[3px] shrink-0">
                <div className="w-[28px] h-[28px] rounded-[7px] bg-[#37c0d7] flex items-center justify-center mb-[10px]">
                    <FolderKanban size={15} className="text-white" strokeWidth={2} />
                </div>

                <RailItem icon={LayoutDashboard} label="Home" active={location.pathname === '/'} onClick={() => navigate('/')} />
                <RailItem icon={CalendarDays} label="Calendar" active={location.pathname.startsWith('/time')} onClick={() => navigate('/time')} />
                {user?.role !== 'client' && <RailItem icon={Mail} label="Messages" active={location.pathname.startsWith('/chat')} onClick={() => navigate('/chat')} />}
                {(user?.role === 'admin' || user?.role === 'manager') && <RailItem icon={Briefcase} label="Clients" active={location.pathname === '/clients'} onClick={() => navigate('/clients')} />}
                {user?.role === 'admin' && <RailItem icon={Users} label="Team" active={location.pathname === '/team'} onClick={() => navigate('/team')} />}
                <RailItem icon={Star} label="Projects" active={location.pathname.startsWith('/projects')} onClick={() => navigate('/projects')} />
                {user?.role === 'admin' && <RailItem icon={Github} label="GitHub" active={location.pathname === '/github'} onClick={() => navigate('/github')} />}
                {user?.role === 'admin' && <RailItem icon={Rocket} label="Dockploy" active={location.pathname === '/dockploy'} onClick={() => navigate('/dockploy')} />}
                {user?.role === 'admin' && <RailItem icon={Download} label="IDE Updates" active={location.pathname === '/ide-updates'} onClick={() => navigate('/ide-updates')} />}

                <div className="mt-auto flex flex-col items-center gap-2">
                    <RailItem icon={LogOut} label="Logout" onClick={logout} />
                    <UserAvatar firstName={user?.firstName} lastName={user?.lastName} email={user?.email} profileImageUrl={user?.profileImageUrl} sizeClassName="w-7 h-7" textClassName="text-[10px]" />
                </div>
            </div>

            <aside className="w-[292px] border-r border-[#2a3645] bg-[#1d2735] flex flex-col shrink-0 overflow-hidden">
                <div className="px-4 pt-[10px] pb-[9px] border-b border-[#2a3645]">
                    <p className="text-[13px] font-bold text-[#75d8e8]">Todo V2</p>
                    <p className="text-[11px] text-[#8090a4] mt-0.5">Project workspace</p>
                </div>

                <div className="flex-1 overflow-y-auto py-2">
                    <div className="px-3 mb-3">
                        <button className="w-full bg-[#253242] border border-[#344355] rounded-md px-3 py-1.5 flex items-center gap-2 text-[#c4d0df] hover:border-[#4b607a] transition-all text-[13px] font-medium">
                            <span className="w-4 h-4 rounded-full bg-[#3fc2d6] text-[#0f1722] text-[10px] font-bold flex items-center justify-center">+</span>
                            <span>New work item</span>
                        </button>
                    </div>

                    <SidebarItem to="/" icon={LayoutDashboard} label="Home" exact />
                    <SidebarItem to="/verifications" icon={CheckSquare} label="Verifications" alert={myPendingVerifications > 0} />
                    {user?.role !== 'client' && <SidebarItem to="/chat" icon={MessageCircle} label="Chat" />}

                    <SectionLabel label="Projects" onAdd={user?.role === 'client' ? undefined : () => navigate('/projects?action=create')} />
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

                <div className="border-t border-[#2a3645] p-3 flex items-center gap-2.5 bg-[#1a2330]">
                    <UserAvatar firstName={user?.firstName} lastName={user?.lastName} email={user?.email} profileImageUrl={user?.profileImageUrl} sizeClassName="w-7 h-7" textClassName="text-[10px]" />
                    <div>
                        <p className="text-[12px] font-medium text-[#d7e2ef] leading-none">{[user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'User'}</p>
                        <p className="text-[10.5px] text-[#8798ad] mt-1 capitalize">{user?.role || 'member'}</p>
                    </div>
                </div>
            </aside>

            <div className="flex-1 min-w-0 flex flex-col bg-[#1b2532]">
                <Header />
                <div className="h-[34px] border-b border-[#2a3645] bg-[#192331] px-2.5 flex items-end gap-1">
                    <button className="h-[28px] px-3 rounded-t-md border border-b-0 border-[#395069] bg-[#253546] text-[#d7e2ef] text-[11.5px] font-medium">
                        package.json
                    </button>
                    <button className="h-[28px] px-3 rounded-t-md border border-b-0 border-[#2a3645] bg-[#1f2b3a] text-[#8ea0b7] text-[11.5px]">
                        current-view.tsx
                    </button>
                    <div className="ml-auto mb-1.5 text-[10.5px] text-[#72839a]">3 files open</div>
                </div>

                <div className="flex-1 min-h-0 flex">
                    <main className="flex-1 overflow-auto bg-gradient-to-b from-[#1b2532] to-[#151f2b] p-2.5">
                        <div className="min-h-full rounded-[10px] border border-[#2a3645] bg-[#101924]/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                            {children}
                        </div>
                    </main>
                    <RightMiniAvatars />
                </div>

                <div className="h-[188px] border-t border-[#2a3645] bg-[#141d29] px-3 pt-2">
                    <div className="flex items-center gap-2 text-[#8ea0b7] text-[11px]">
                        <Terminal size={13} />
                        <span className="font-semibold uppercase tracking-[0.8px]">Terminal</span>
                        <span className="ml-1 text-[#667991]">Local</span>
                        <div className="ml-auto">
                            <GripHorizontal size={14} />
                        </div>
                    </div>
                    <div className="mt-2 rounded-md border border-[#2a3645] bg-[#0e151f] h-[142px] p-2 font-mono text-[11px] text-[#87d6a9]">
                        $ npm run sup
                    </div>
                </div>

                <div className="h-[28px] border-t border-[#2a3645] px-3 flex items-center gap-2 bg-[#16212d]">
                    <button className="h-6 px-3 rounded bg-[#2b394a] text-[#c4d0df] text-[11px] font-semibold hover:bg-[#33475d] transition-colors flex items-center gap-1.5">
                        <Blocks size={13} />
                        {projects.find((p: any) => p._id === activeProjectId)?.name || 'FreshImpact V3'}
                    </button>
                    <button className="h-6 px-3 rounded border border-[#334255] text-[#9fb0c6] text-[11px] font-semibold hover:bg-[#233142] transition-colors flex items-center gap-1.5">
                        <BookText size={13} />
                        Documentation
                    </button>
                    <div className="ml-auto flex items-center gap-1.5">
                        <span className="w-6 h-6 rounded bg-[#2f4054] text-[#b7c5d8] text-[9px] font-bold flex items-center justify-center">R</span>
                        <span className="w-6 h-6 rounded bg-[#2f4054] text-[#b7c5d8] text-[9px] font-bold flex items-center justify-center">TS</span>
                        <span className="w-6 h-6 rounded bg-[#2f4054] text-[#b7c5d8] text-[9px] font-bold flex items-center justify-center">N</span>
                        <span className="w-6 h-6 rounded bg-[#2f4054] text-[#b7c5d8] text-[9px] font-bold flex items-center justify-center">F</span>
                        <span className="w-6 h-6 rounded bg-[#2f4054] text-[#b7c5d8] text-[9px] font-bold flex items-center justify-center">V</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Layout;
