import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Bell,
    Calendar,
    CheckCheck,
    Maximize,
    MenuSquare,
    MessageSquare,
    Search,
    Star,
    Sun,
    Users,
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
        className="w-[30px] h-[30px] rounded-md flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
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

            <div className="relative" ref={dropdownRef}>
                <button
                    title="Notifications"
                    onClick={() => setOpen((prev) => !prev)}
                    className="relative w-[30px] h-[30px] rounded-md flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                    <Bell size={15} strokeWidth={1.8} />
                    {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] rounded-full bg-[#4f6ef7] text-white text-[9px] font-semibold px-1 leading-[14px] text-center">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </button>

                {open && (
                    <div className="absolute right-0 mt-2 w-[380px] bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
                            <p className="text-sm font-semibold text-gray-800">Notifications</p>
                            <button
                                onClick={() => markAllMutation.mutate()}
                                disabled={markAllMutation.isPending || unreadCount === 0}
                                className="text-xs text-indigo-600 hover:text-indigo-700 disabled:opacity-40 flex items-center gap-1"
                            >
                                <CheckCheck size={13} />
                                Mark all read
                            </button>
                        </div>
                        <div className="max-h-[420px] overflow-y-auto">
                            {notifications.length === 0 ? (
                                <p className="px-3 py-6 text-sm text-gray-500 text-center">No notifications yet.</p>
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
                                            className={`w-full text-left px-3 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${isUnread ? 'bg-indigo-50/50' : 'bg-white'}`}
                                        >
                                            <div className="flex items-start gap-2">
                                                <span className={`mt-1 w-2 h-2 rounded-full ${isUnread ? 'bg-indigo-500' : 'bg-gray-300'}`} />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-semibold text-gray-800 truncate">{notification.title}</p>
                                                    <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{notification.message}</p>
                                                    <p className="text-[11px] text-gray-400 mt-1">{toRelative(notification.createdAt)}</p>
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
        </header>
    );
};

export default Header;
