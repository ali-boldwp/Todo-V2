import { useMemo, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { mockNotifications } from '../data/mockData';
import { useQuery } from '@tanstack/react-query';
import { getProjects } from '../../services/core';
import { getTasks } from '../../services/task';
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  CheckSquare,
  LogOut,
  ChevronRight,
  LayoutGrid,
  ListTodo,
  Settings,
  FileText,
  MessageCircle,
  Bell,
  Search,
  Star,
  Menu,
  Plus,
  Clock,
  Github,
  Sparkles,
  Briefcase,
} from 'lucide-react';

// Simple avatar component
const UserAvatar = ({ firstName, lastName, email, sizeClassName = 'w-8 h-8', textClassName = 'text-xs' }: any) => {
  const initials = firstName && lastName
    ? `${firstName[0]}${lastName[0]}`.toUpperCase()
    : email
      ? email[0].toUpperCase()
      : 'U';
  
  return (
    <div className={`${sizeClassName} rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white ${textClassName} font-bold flex items-center justify-center shrink-0`}>
      {initials}
    </div>
  );
};

const SidebarItem = ({ to, icon: Icon, label, exact, alert }: { to: string; icon: any; label: string; exact?: boolean; alert?: boolean }) => {
  const location = useLocation();
  const isActive = exact ? location.pathname === to : location.pathname === to || (to !== '/' && location.pathname.startsWith(`${to}/`));

  return (
    <Link
      to={to}
      className={`group flex items-center gap-3 px-3 py-2.5 text-sm transition-all rounded-xl mx-3 mb-1 relative overflow-hidden ${
        isActive 
          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-lg shadow-indigo-200' 
          : 'text-slate-600 hover:bg-slate-100 font-medium'
      }`}
    >
      {isActive && (
        <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
      <Icon size={20} className={`relative z-10 ${alert ? 'text-rose-500' : (isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600')} transition-colors`} strokeWidth={2.2} />
      <span className={`relative z-10 truncate flex-1 ${alert && !isActive ? 'text-rose-600 font-semibold' : ''}`}>{label}</span>
      {alert && (
        <span className={`relative z-10 flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold ${
          isActive 
            ? 'bg-white/20 text-white' 
            : 'bg-rose-500 text-white'
        }`}>
          {typeof alert === 'number' ? alert : '!'}
        </span>
      )}
    </Link>
  );
};

const SectionLabel = ({ label, onAdd }: { label: string; onAdd?: () => void }) => (
  <div className="px-5 py-3 mt-6 mb-2 flex items-center justify-between">
    <div className="flex items-center gap-2">
      <div className="w-1 h-4 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full" />
      <span className="text-[11px] uppercase tracking-[0.1em] text-slate-500 font-bold">{label}</span>
    </div>
    {onAdd && (
      <button
        onClick={onAdd}
        title={`Add ${label}`}
        className="p-1 rounded-md bg-slate-100 hover:bg-gradient-to-r hover:from-indigo-500 hover:to-purple-600 text-slate-500 hover:text-white transition-all"
      >
        <Plus size={12} strokeWidth={3} />
      </button>
    )}
  </div>
);

const PROJECT_SUB_ITEMS = [
  { label: 'Overview', path: 'overview', icon: LayoutGrid },
  { label: 'Tasks', path: 'tasks', icon: ListTodo },
  { label: 'Verifications', path: 'verifications', icon: CheckSquare },
  { label: 'Documents', path: 'documents', icon: FileText },
  { label: 'Settings', path: 'settings', icon: Settings },
];

const ProjectItem = ({ project, isOpen, onToggle }: { project: any; isOpen: boolean; onToggle: () => void }) => {
  const location = useLocation();
  const { user } = useAuth();
  
  const basePath = `/project/${project._id}`;
  const isParentActive = location.pathname.startsWith(basePath);

  const { data: projectTasks = [] } = useQuery({ 
    queryKey: ['tasks', project._id], 
    queryFn: () => getTasks(project._id),
    enabled: isOpen || isParentActive || true
  });

  const myId = user?.id?.toString?.() || '';
  const projectPendingForMe = projectTasks.filter((task: any) => {
    const verifierId = task?.verifierId?._id?.toString?.() || task?.verifierId?.toString?.() || '';
    const isPendingVerification = task?.verificationStatus === 'pending' || task?.status === 'under_verification';
    return isPendingVerification && verifierId === myId;
  }).length;

  const totalTasks = projectTasks.length;
  const doneTasks = projectTasks.filter((t: any) => t.status === 'done').length;

  return (
    <div className="mb-1">
      <button
        onClick={onToggle}
        className={`group w-full flex items-center gap-2 px-3 py-2 text-sm font-medium transition-all rounded-xl mx-3 relative ${
          isParentActive 
            ? 'bg-indigo-50 text-indigo-700' 
            : 'text-slate-700 hover:bg-slate-50'
        }`}
      >
        <ChevronRight 
          size={16} 
          className={`text-slate-400 group-hover:text-indigo-600 transition-all ${isOpen ? 'rotate-90' : ''}`} 
          strokeWidth={2.5} 
        />
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
          {project.name.substring(0, 2).toUpperCase()}
        </div>
        <span className="truncate text-left flex-1">{project.name}</span>
        {totalTasks > 0 && (
          <span className="text-[10px] text-slate-400 group-hover:text-slate-600 font-semibold">
            {doneTasks}/{totalTasks}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="ml-8 mr-3 mt-1 mb-2 space-y-0.5 pl-3 border-l-2 border-slate-100">
          {PROJECT_SUB_ITEMS.map((item) => {
            if (item.path === 'settings' && user?.role !== 'admin') return null;
            const to = `${basePath}/${item.path}`;
            const isActive = location.pathname === to || location.pathname.startsWith(`${to}/`);
            const hasAlert = item.path === 'verifications' && projectPendingForMe > 0;
            
            return (
              <Link
                key={item.path}
                to={to}
                className={`flex items-center gap-2.5 px-3 py-2 text-sm transition-all rounded-lg ${
                  isActive 
                    ? 'text-indigo-600 font-semibold bg-indigo-50' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
                }`}
              >
                <item.icon size={16} strokeWidth={2.2} className={hasAlert ? 'text-rose-500' : (isActive ? 'text-indigo-600' : 'text-slate-400')} />
                <span className={`flex-1 ${hasAlert ? 'text-rose-600 font-semibold' : ''}`}>{item.label}</span>
                {hasAlert && (
                  <span className="min-w-[18px] h-5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-bold text-center flex items-center justify-center">
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

export function PremiumLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState(mockNotifications);

  const { data: mockProjects = [] } = useQuery({ queryKey: ['projects'], queryFn: getProjects });
  const { data: mockTasks = [] } = useQuery({ queryKey: ['tasks', 'all'], queryFn: () => getTasks('' as any).catch(() => []) });
  
  const activeProjectId = useMemo(() => {
    const match = location.pathname.match(/^\/project\/([^/]+)/);
    return match ? match[1] : null;
  }, [location.pathname]);

  const [openProjectId, setOpenProjectId] = useState<string | null>(activeProjectId);

  useEffect(() => {
    if (activeProjectId) setOpenProjectId(activeProjectId);
  }, [activeProjectId]);

  // Count pending verifications for user
  const myId = user?.id?.toString?.() || '';
  const myPendingVerificationTasks = mockTasks.filter((task: any) => {
    const verifierId = task?.verifierId?._id?.toString?.() || task?.verifierId?.toString?.() || '';
    const isPendingVerification = task?.verificationStatus === 'pending' || task?.status === 'under_verification';
    return isPendingVerification && verifierId === myId;
  });
  const myPendingVerifications = myPendingVerificationTasks.length;

  const myActiveTaskCount = mockTasks.filter((task: any) => {
    const activeWorkerId = task?.activeWorkerId?._id?.toString?.() || task?.activeWorkerId?.toString?.() || '';
    const activeVerifierId = task?.activeVerifierId?._id?.toString?.() || task?.activeVerifierId?.toString?.() || '';
    return (activeWorkerId === myId || activeVerifierId === myId) && !task.isWorkPaused && !task.isVerificationPaused;
  }).length;

  const shouldBlockForVerification = 
    (user?.role === 'member' || user?.role === 'manager') && 
    myPendingVerifications > 0 && 
    myActiveTaskCount === 0;

  const unreadCount = notifications.filter(n => !n.readAt).length;

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, readAt: n.readAt || new Date().toISOString() })));
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      {/* Main Sidebar */}
      <aside className={`${isSidebarOpen ? 'w-72' : 'w-0'} transition-all duration-300 border-r border-slate-200 bg-white flex flex-col shrink-0 overflow-hidden shadow-lg`}>
        {/* Sidebar Header */}
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
              <FolderKanban className="text-white" size={20} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-base font-bold text-slate-900">Todo V2</p>
              <p className="text-xs text-slate-500">Project Workspace</p>
            </div>
          </div>
        </div>

        {/* Quick Action */}
        <div className="px-4 py-3">
          <button className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg px-4 py-2.5 flex items-center justify-center gap-2 text-sm font-semibold shadow-md hover:shadow-lg transition-all">
            <Plus size={16} strokeWidth={2.5} />
            <span>New Work Item</span>
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-2">
          <SidebarItem to="/" icon={LayoutDashboard} label="Dashboard" exact />
          <SidebarItem to="/projects" icon={Star} label="All Projects" />
          <SidebarItem to="/verifications" icon={CheckSquare} label="Verifications" alert={myPendingVerifications > 0} />
          <SidebarItem to="/team" icon={Users} label="Team" />
          {user?.role === 'admin' && <SidebarItem to="/clients" icon={Briefcase} label="Clients" />}
          {user?.role !== 'client' && <SidebarItem to="/time" icon={Clock} label="Time Tracking" />}
          {user?.role !== 'client' && <SidebarItem to="/chat" icon={MessageCircle} label="Chat" />}
          {user?.role === 'admin' && <SidebarItem to="/github-settings" icon={Github} label="GitHub" />}
          {user?.role === 'admin' && <SidebarItem to="/ai-settings" icon={Sparkles} label="AI Settings" />}

          <SectionLabel label="Projects" onAdd={() => navigate('/projects?action=create')} />
          <div className="space-y-1">
            {mockProjects.map((project: any) => (
              <ProjectItem
                key={project._id}
                project={project}
                isOpen={openProjectId === project._id}
                onToggle={() => setOpenProjectId((prev) => (prev === project._id ? null : project._id))}
              />
            ))}
          </div>
        </div>

        {/* User Profile */}
        <div className="border-t border-slate-100 p-4 bg-gradient-to-r from-slate-50 to-indigo-50/50">
          <div className="flex items-center gap-3">
            <UserAvatar 
              firstName={user?.firstName} 
              lastName={user?.lastName} 
              email={user?.email} 
              sizeClassName="w-10 h-10" 
              textClassName="text-xs"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">
                {[user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'User'}
              </p>
              <p className="text-xs text-slate-500 capitalize">{user?.role || 'member'}</p>
            </div>
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header */}
        <header className="h-16 border-b border-slate-200 bg-white shadow-sm px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
            >
              <Menu size={20} />
            </button>
            
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <span className="text-white text-xs font-bold">TV</span>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Todo V2</p>
                <p className="text-xs text-slate-500">Premium Edition</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-lg border border-slate-200 hover:border-indigo-300 transition-colors">
              <Search size={16} className="text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                className="bg-transparent outline-none text-sm text-slate-700 placeholder:text-slate-400 w-48"
              />
            </div>

            {/* Quick Actions */}
            <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors" title="Projects">
              <Star size={20} />
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                title="Notifications"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-96 bg-white border border-slate-200 rounded-xl shadow-2xl z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                    <p className="text-sm font-bold text-slate-900">Notifications</p>
                    <button
                      onClick={markAllAsRead}
                      disabled={unreadCount === 0}
                      className="text-xs text-indigo-600 hover:text-indigo-700 disabled:opacity-40 font-semibold"
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="px-4 py-8 text-sm text-slate-500 text-center">No notifications yet.</p>
                    ) : (
                      notifications.map((notification: any) => {
                        const isUnread = !notification?.readAt;
                        return (
                          <button
                            key={notification._id}
                            onClick={() => {
                              if (isUnread) {
                                setNotifications(notifications.map(n => 
                                  n._id === notification._id ? { ...n, readAt: new Date().toISOString() } : n
                                ));
                              }
                              if (notification?.link) navigate(notification.link);
                              setIsNotificationsOpen(false);
                            }}
                            className={`w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors ${
                              isUnread ? 'bg-indigo-50/30' : ''
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <span className={`mt-1 w-2 h-2 rounded-full ${isUnread ? 'bg-indigo-500' : 'bg-slate-300'}`} />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-slate-900 truncate">{notification.title}</p>
                                <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{notification.message}</p>
                                <p className="text-[11px] text-slate-400 mt-1">
                                  {new Date(notification.createdAt).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Menu */}
            <div className="ml-2">
              <UserAvatar 
                firstName={user?.firstName} 
                lastName={user?.lastName} 
                email={user?.email}
                sizeClassName="w-9 h-9"
                textClassName="text-xs"
              />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-gradient-to-br from-slate-50/50 via-white to-indigo-50/30">
          <Outlet />
        </main>
      </div>

      {/* Click outside to close notifications */}
      {isNotificationsOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsNotificationsOpen(false)}
        />
      )}

      {/* Global Verification Blocker */}
      {shouldBlockForVerification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-8 max-w-lg w-full">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-rose-100 mb-6 mx-auto">
              <CheckSquare className="w-8 h-8 text-rose-600" />
            </div>
            
            <h2 className="text-2xl font-bold text-slate-900 text-center mb-2">
              Action Required
            </h2>
            <p className="text-slate-600 text-center mb-6">
              You have {myPendingVerifications} pending task(s) awaiting your verification.
              Please start verification before continuing your work.
            </p>
            
            <div className="space-y-3 mb-6 max-h-60 overflow-y-auto">
              {myPendingVerificationTasks.map((task: any) => (
                <div key={task._id} className="p-4 rounded-xl border border-rose-100 bg-rose-50 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-rose-900 truncate">{task.title}</p>
                    <p className="text-xs text-rose-700 mt-0.5">Project: {task?.projectId?.name || 'Unknown'}</p>
                  </div>
                  <button 
                    onClick={() => navigate(`/project/${task?.projectId?._id?.toString?.() || task?.projectId}/verifications`)}
                    className="ml-4 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-colors shrink-0"
                  >
                    Review
                  </button>
                </div>
              ))}
            </div>

            <div className="text-center text-xs text-slate-400">
              Your workflow is currently paused until pending verifications are addressed.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}