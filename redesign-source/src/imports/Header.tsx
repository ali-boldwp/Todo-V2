import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Bell,
    Calendar,
    CheckCheck,
    GitBranch,
    Grip,
    Maximize,
    MessageSquare,
    Minus,
    Play,
    Settings2,
    Search,
    Square,
    Star,
    Users,
    X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
    getMyNotifications,
    getMyUnreadNotificationCount,
    markAllNotificationsRead,
    markNotificationRead,
} from '../services/notification';

const IconBtn = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <button
        title={title}
        className="w-[28px] h-[28px] rounded-[6px] flex items-center justify-center text-[#8e9bad] hover:text-[#d5e1ef] hover:bg-[#2a3644] transition-colors"
    >
        {children}
    </button>
);

const toRelative = (value: string) => {
    const date = new Date(value);
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
};

const Header: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [open, setOpen] = React.useState(false);
    const dropdownRef = React.useRef<HTMLDivElement | null>(null);

    const { data: unreadData } = useQuery({
        queryKey: ['notifications-unread-count'],
        queryFn: getMyUnreadNotificationCount,
    });
    const unreadCount = Number(unreadData?.unreadCount || 0);

    const { data: notificationsData } = useQuery({
        queryKey: ['notifications'],
        queryFn: () => getMyNotifications(30),
        enabled: open,
    });
    const notifications = notificationsData?.items || [];

    const markOneMutation = useMutation({
        mutationFn: markNotificationRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
        },
    });

    const markAllMutation = useMutation({
        mutationFn: markAllNotificationsRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
        },
    });

    React.useEffect(() => {
        const onClickOutside = (event: MouseEvent) => {
            if (!dropdownRef.current) return;
            if (!dropdownRef.current.contains(event.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', onClickOutside);
        return () => document.removeEventListener('mousedown', onClickOutside);
    }, []);

    return (
        <header className="h-[38px] border-b border-[#2a3645] px-2 pl-3 flex items-center gap-1 shrink-0 bg-[#1c2833]">
            <div className="mr-2 flex items-center gap-2.5">
                <div className="h-[18px] w-[18px] rounded-[4px] bg-[#37c0d7] text-[#0f1722] text-[9px] font-bold flex items-center justify-center">
                    TV
                </div>
                <span className="text-[12px] font-medium text-[#d5e1ef]">Todo V2</span>
                <span className="inline-flex items-center gap-1 text-[10.5px] text-[#7d8da3]">
                    <GitBranch size={11} />
                    main
                </span>
            </div>
            <IconBtn title="Menu">
                <Grip size={14} strokeWidth={1.9} />
            </IconBtn>
            <IconBtn title="Calendar">
                <Calendar size={14} strokeWidth={1.8} />
            </IconBtn>
            <IconBtn title="Messages">
                <MessageSquare size={14} strokeWidth={1.8} />
            </IconBtn>
            <IconBtn title="Team">
                <Users size={14} strokeWidth={1.8} />
            </IconBtn>
            <IconBtn title="Star">
                <Star size={14} strokeWidth={1.8} />
            </IconBtn>

            <div className="w-px h-4 bg-[#2a3645] mx-1" />
            <div className="flex-1 text-center pr-2">
                <span className="inline-flex items-center rounded-md border border-[#344355] bg-[#21303f] px-3 py-[3px] text-[10.5px] font-semibold text-[#a7b5c7]">
                    Current File
                </span>
            </div>

            <button className="px-2 py-[3px] rounded-md text-[10.5px] text-[#9aa8b9] hover:bg-[#2a3644] transition-colors">EN</button>

            <IconBtn title="Run">
                <Play size={13} strokeWidth={2} />
            </IconBtn>
            <IconBtn title="Fullscreen">
                <Maximize size={14} strokeWidth={1.8} />
            </IconBtn>
            <IconBtn title="Search">
                <Search size={14} strokeWidth={1.8} />
            </IconBtn>
            <IconBtn title="Settings">
                <Settings2 size={14} strokeWidth={1.8} />
            </IconBtn>

            <div className="relative" ref={dropdownRef}>
                <button
                    title="Notifications"
                    onClick={() => setOpen((prev) => !prev)}
                    className="relative w-[28px] h-[28px] rounded-[6px] flex items-center justify-center text-[#8e9bad] hover:text-[#d5e1ef] hover:bg-[#2a3644] transition-colors"
                >
                    <Bell size={14} strokeWidth={1.8} />
                    {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] rounded-full bg-[#37c0d7] text-[#0e141d] text-[9px] font-bold px-1 leading-[14px] text-center">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </button>

                {open && (
                    <div className="absolute right-0 mt-2 w-[380px] bg-[#1f2734] border border-[#334255] rounded-lg shadow-lg shadow-black/40 z-50">
                        <div className="flex items-center justify-between px-3 py-2 border-b border-[#334255]">
                            <p className="text-sm font-semibold text-[#d7e2ef]">Notifications</p>
                            <button
                                onClick={() => markAllMutation.mutate()}
                                disabled={markAllMutation.isPending || unreadCount === 0}
                                className="text-xs text-[#76d9e8] hover:text-[#a7ebf5] disabled:opacity-40 flex items-center gap-1"
                            >
                                <CheckCheck size={13} />
                                Mark all read
                            </button>
                        </div>
                        <div className="max-h-[420px] overflow-y-auto">
                            {notifications.length === 0 ? (
                                <p className="px-3 py-6 text-sm text-[#9aa8b9] text-center">No notifications yet.</p>
                            ) : (
                                notifications.map((notification: any) => {
                                    const isUnread = !notification?.readAt;
                                    return (
                                        <button
                                            key={notification._id}
                                            onClick={() => {
                                                if (isUnread) markOneMutation.mutate(notification._id);
                                                if (notification?.link) navigate(notification.link);
                                                setOpen(false);
                                            }}
                                            className={`w-full text-left px-3 py-3 border-b border-[#334255] hover:bg-[#273243] transition-colors ${isUnread ? 'bg-[#243040]' : 'bg-[#1f2734]'}`}
                                        >
                                            <div className="flex items-start gap-2">
                                                <span className={`mt-1 w-2 h-2 rounded-full ${isUnread ? 'bg-[#3fc2d6]' : 'bg-[#516276]'}`} />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-semibold text-[#d7e2ef] truncate">{notification.title}</p>
                                                    <p className="text-xs text-[#a0aec0] mt-0.5 line-clamp-2">{notification.message}</p>
                                                    <p className="text-[11px] text-[#6f8197] mt-1">{toRelative(notification.createdAt)}</p>
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

            <div className="ml-1 mr-0.5 flex items-center border-l border-[#2a3645] pl-2">
                <button className="h-6 w-8 flex items-center justify-center text-[#7f8ea2] hover:bg-[#2a3341] hover:text-[#d5e1ef]">
                    <Minus size={12} />
                </button>
                <button className="h-6 w-8 flex items-center justify-center text-[#7f8ea2] hover:bg-[#2a3341] hover:text-[#d5e1ef]">
                    <Square size={11} />
                </button>
                <button className="h-6 w-8 flex items-center justify-center text-[#7f8ea2] hover:bg-[#8f2d3d] hover:text-white">
                    <X size={12} />
                </button>
            </div>
        </header>
    );
};

export default Header;
