import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    createOrGetConversation,
    createOrGetProjectGroup,
    createOrGetTeamGroup,
    getChatUsers,
    getConversationMessages,
    getConversations,
    getOnlineUsers,
    markConversationRead,
    sendConversationMessage,
} from '../services/chat';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { getProjects } from '../services/core';
import UserAvatar from '../components/UserAvatar';

const formatTime = (value?: string | Date) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const Chat: React.FC = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const { joinConversation, leaveConversation, startTyping, stopTyping, typingUsersByConversation } = useSocket();
    const [selectedConversationId, setSelectedConversationId] = useState<string>('');
    const [draft, setDraft] = useState('');
    const typingTimerRef = useRef<number | null>(null);

    const { data: conversations = [] } = useQuery({
        queryKey: ['chat', 'conversations'],
        queryFn: getConversations,
    });

    const { data: chatUsers = [] } = useQuery({
        queryKey: ['chat', 'users'],
        queryFn: getChatUsers,
    });

    const { data: onlineUsersResponse } = useQuery({
        queryKey: ['chat', 'online-users'],
        queryFn: getOnlineUsers,
        refetchInterval: 30000,
    });

    const onlineUserIds = useMemo(
        () => new Set<string>((onlineUsersResponse?.userIds || []).map((id: any) => String(id))),
        [onlineUsersResponse]
    );

    const { data: projects = [] } = useQuery({
        queryKey: ['projects'],
        queryFn: getProjects,
    });

    const { data: messages = [] } = useQuery({
        queryKey: ['chat', 'messages', selectedConversationId],
        queryFn: () => getConversationMessages(selectedConversationId),
        enabled: !!selectedConversationId,
    });

    const createConversationMutation = useMutation({
        mutationFn: (participantId: string) => createOrGetConversation(participantId),
        onSuccess: (conversation) => {
            queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
            setSelectedConversationId(conversation._id);
        },
        onError: (error: any) => alert(error?.response?.data?.message || 'Failed to start conversation'),
    });

    const createTeamGroupMutation = useMutation({
        mutationFn: () => createOrGetTeamGroup('Team Room'),
        onSuccess: (conversation) => {
            queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
            setSelectedConversationId(conversation._id);
        },
        onError: (error: any) => alert(error?.response?.data?.message || 'Failed to open team room'),
    });

    const createProjectGroupMutation = useMutation({
        mutationFn: (projectId: string) => createOrGetProjectGroup(projectId),
        onSuccess: (conversation) => {
            queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
            setSelectedConversationId(conversation._id);
        },
        onError: (error: any) => alert(error?.response?.data?.message || 'Failed to open project room'),
    });

    const sendMessageMutation = useMutation({
        mutationFn: (text: string) => sendConversationMessage(selectedConversationId, text),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['chat', 'messages', selectedConversationId] });
            queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
            setDraft('');
            if (selectedConversationId) stopTyping(selectedConversationId);
        },
        onError: (error: any) => alert(error?.response?.data?.message || 'Failed to send message'),
    });

    const markReadMutation = useMutation({
        mutationFn: (conversationId: string) => markConversationRead(conversationId),
        onSuccess: (_, conversationId) => {
            queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
            queryClient.invalidateQueries({ queryKey: ['chat', 'messages', conversationId] });
        },
    });

    useEffect(() => {
        if (!selectedConversationId && conversations.length > 0) {
            setSelectedConversationId(conversations[0]._id);
        }
    }, [conversations, selectedConversationId]);

    useEffect(() => {
        if (!selectedConversationId) return;
        joinConversation(selectedConversationId);
        return () => leaveConversation(selectedConversationId);
    }, [selectedConversationId, joinConversation, leaveConversation]);

    useEffect(() => {
        return () => {
            if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
        };
    }, []);

    const selectedConversation = useMemo(
        () => conversations.find((c: any) => c._id === selectedConversationId),
        [conversations, selectedConversationId]
    );

    useEffect(() => {
        if (!selectedConversationId || !selectedConversation) return;
        if ((selectedConversation.unreadCount || 0) > 0 && !markReadMutation.isPending) {
            markReadMutation.mutate(selectedConversationId);
        }
    }, [selectedConversationId, selectedConversation]);

    const getDirectOtherParticipant = (conversation: any) => {
        if (!conversation || conversation.type === 'group') return null;
        return conversation.participants?.find((p: any) => p._id !== user?.id) || null;
    };

    const typingUserNames = useMemo(() => {
        const typingIds: string[] = typingUsersByConversation[selectedConversationId] || [];
        if (!typingIds.length || !selectedConversation?.participants) return [];
        return selectedConversation.participants
            .filter((p: any) => typingIds.includes(String(p._id)) && p._id !== user?.id)
            .map((p: any) => `${p.firstName} ${p.lastName}`);
    }, [typingUsersByConversation, selectedConversationId, selectedConversation, user?.id]);

    const getConversationTitle = (conversation: any): string => {
        if (!conversation) return 'Conversation';
        if (conversation.type === 'group') return conversation.name || (conversation.projectId?.name ? `${conversation.projectId.name} Team` : 'Group Chat');
        const other = getDirectOtherParticipant(conversation);
        return other ? `${other.firstName} ${other.lastName}` : 'Conversation';
    };

    const getConversationSubtitle = (conversation: any): string => {
        if (!conversation) return '';
        if (conversation.type === 'group') {
            return conversation.projectId?.name ? `Project: ${conversation.projectId.name}` : 'Team group';
        }
        const other = getDirectOtherParticipant(conversation);
        return other?.role || '';
    };

    const isConversationOnline = (conversation: any) => {
        const other = getDirectOtherParticipant(conversation);
        if (!other?._id) return false;
        return onlineUserIds.has(String(other._id));
    };

    const isInternal = ['admin', 'manager', 'member'].includes(user?.role || '');

    if (!isInternal) {
        return <div className="p-6 text-sm text-gray-500">Chat is available only for internal team.</div>;
    }

    return (
        <div className="h-full flex app-fade-in">
            <div className="w-80 border-r border-gray-200 bg-white flex flex-col">
                <div className="p-4 border-b border-gray-200 space-y-3">
                    <div>
                        <h1 className="text-[18px] font-extrabold tracking-[-0.3px] text-gray-900">Messenger</h1>
                        <p className="text-xs text-gray-500 mt-1">Direct and group conversations</p>
                    </div>

                    <button
                        onClick={() => createTeamGroupMutation.mutate()}
                        className="w-full h-8 text-[12.5px] font-semibold border border-gray-200 rounded-md px-3 hover:bg-gray-50"
                    >
                        Open Team Room
                    </button>

                    <select
                        defaultValue=""
                        onChange={(e) => {
                            const projectId = e.target.value;
                            if (!projectId) return;
                            createProjectGroupMutation.mutate(projectId);
                            e.target.value = '';
                        }}
                        className="w-full h-8 text-[12.5px] border border-gray-200 rounded-md px-3 focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/20 focus:border-[#4f6ef7]"
                    >
                        <option value="">Open project room...</option>
                        {projects.map((p: any) => (
                            <option key={p._id} value={p._id}>
                                {p.name}
                            </option>
                        ))}
                    </select>

                    <select
                        defaultValue=""
                        onChange={(e) => {
                            const participantId = e.target.value;
                            if (!participantId) return;
                            createConversationMutation.mutate(participantId);
                            e.target.value = '';
                        }}
                        className="w-full h-8 text-[12.5px] border border-gray-200 rounded-md px-3 focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/20 focus:border-[#4f6ef7]"
                    >
                        <option value="">New direct conversation...</option>
                        {chatUsers.map((u: any) => (
                            <option key={u._id} value={u._id}>
                                {u.firstName} {u.lastName} ({u.role})
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex-1 overflow-auto">
                    {conversations.map((c: any) => {
                        const active = c._id === selectedConversationId;
                        const unreadCount = Number(c.unreadCount || 0);
                        const online = isConversationOnline(c);
                        const other = getDirectOtherParticipant(c);
                        return (
                            <button
                                key={c._id}
                                onClick={() => setSelectedConversationId(c._id)}
                                className={`w-full text-left px-4 py-3 border-b border-gray-100 transition-colors ${active ? 'bg-[#eef1fe]' : 'hover:bg-gray-50'}`}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <UserAvatar
                                            firstName={other?.firstName}
                                            lastName={other?.lastName}
                                            email={other?.email}
                                            profileImageUrl={other?.profileImageUrl}
                                            sizeClassName="w-7 h-7 shrink-0"
                                            textClassName="text-[10px]"
                                        />
                                        {online && <span className="w-2 h-2 rounded-full bg-green-500" />}
                                        <p className="text-sm font-semibold text-gray-900 truncate">{getConversationTitle(c)}</p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {c.lastMessageAt && <span className="text-[10px] text-gray-500">{formatTime(c.lastMessageAt)}</span>}
                                        {unreadCount > 0 && (
                                            <span className="min-w-5 h-5 px-1 rounded-full bg-[#4f6ef7] text-white text-[10px] font-semibold flex items-center justify-center">
                                                {unreadCount > 99 ? '99+' : unreadCount}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <p className="text-[11px] text-gray-500 mt-0.5">{getConversationSubtitle(c)}</p>
                                <p className="text-xs text-gray-500 truncate mt-1">{c.lastMessage || 'No messages yet'}</p>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="flex-1 flex flex-col bg-white">
                <div className="px-5 py-4 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                        {selectedConversation && (
                            <UserAvatar
                                firstName={getDirectOtherParticipant(selectedConversation)?.firstName}
                                lastName={getDirectOtherParticipant(selectedConversation)?.lastName}
                                email={getDirectOtherParticipant(selectedConversation)?.email}
                                profileImageUrl={getDirectOtherParticipant(selectedConversation)?.profileImageUrl}
                                sizeClassName="w-7 h-7"
                                textClassName="text-[10px]"
                            />
                        )}
                        {selectedConversation && isConversationOnline(selectedConversation) && <span className="w-2 h-2 rounded-full bg-green-500" />}
                        <h2 className="text-sm font-semibold text-gray-900">{selectedConversation ? getConversationTitle(selectedConversation) : 'Select conversation'}</h2>
                    </div>
                    {selectedConversation && (
                        <p className="text-xs text-gray-500 mt-0.5">
                            {typingUserNames.length
                                ? `${typingUserNames.join(', ')} ${typingUserNames.length > 1 ? 'are' : 'is'} typing...`
                                : getConversationSubtitle(selectedConversation)}
                        </p>
                    )}
                </div>

                <div className="flex-1 overflow-auto p-5 space-y-3 bg-[#fafbff]">
                    {!selectedConversationId ? (
                        <p className="text-sm text-gray-500">Pick a conversation to start chatting.</p>
                    ) : messages.length === 0 ? (
                        <p className="text-sm text-gray-500">No messages yet.</p>
                    ) : (
                        messages.map((m: any) => {
                            const mine = m.senderId?._id === user?.id;
                            const deliveredBy = (m.deliveredTo || []).filter((reader: any) => reader?._id && reader._id !== user?.id);
                            const seenBy = (m.readBy || []).filter((reader: any) => reader?._id && reader._id !== user?.id);
                            return (
                                <div key={m._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`flex gap-2 ${mine ? 'flex-row-reverse' : ''} max-w-[80%]`}>
                                        <UserAvatar
                                            firstName={m.senderId?.firstName}
                                            lastName={m.senderId?.lastName}
                                            email={m.senderId?.email}
                                            profileImageUrl={m.senderId?.profileImageUrl}
                                            sizeClassName="w-7 h-7 mt-1 shrink-0"
                                            textClassName="text-[10px]"
                                        />
                                        <div className={`max-w-[70%] px-3 py-2 rounded-2xl ${mine ? 'bg-[#4f6ef7] text-white' : 'bg-white text-gray-800 border border-gray-200'}`}>
                                            <p className="text-xs opacity-80 mb-1">
                                                {m.senderId ? `${m.senderId.firstName} ${m.senderId.lastName}` : 'User'}
                                            </p>
                                            <p className="text-sm whitespace-pre-wrap">{m.text}</p>
                                            <div className="flex items-center justify-between gap-3 mt-1">
                                                <p className="text-[10px] opacity-80">{formatTime(m.createdAt)}</p>
                                                {mine && (
                                                    <p className="text-[10px] opacity-80 text-right">
                                                        {seenBy.length > 0
                                                            ? `Seen by ${seenBy.map((reader: any) => `${reader.firstName} ${reader.lastName}`).join(', ')}`
                                                            : deliveredBy.length > 0
                                                                ? 'Delivered'
                                                                : 'Sent'}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="p-4 border-t border-gray-200">
                    <div className="flex gap-2">
                        <input
                            value={draft}
                            onChange={(e) => {
                                const value = e.target.value;
                                setDraft(value);
                                if (!selectedConversationId) return;
                                if (value.trim()) {
                                    startTyping(selectedConversationId);
                                    if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
                                    typingTimerRef.current = window.setTimeout(() => stopTyping(selectedConversationId), 1200);
                                } else {
                                    stopTyping(selectedConversationId);
                                }
                            }}
                            onBlur={() => selectedConversationId && stopTyping(selectedConversationId)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    if (draft.trim() && selectedConversationId) sendMessageMutation.mutate(draft.trim());
                                }
                            }}
                            placeholder={selectedConversationId ? 'Type a message...' : 'Select a conversation first'}
                            disabled={!selectedConversationId}
                            className="flex-1 text-sm border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/20 focus:border-[#4f6ef7] disabled:bg-gray-100"
                        />
                        <button
                            onClick={() => draft.trim() && selectedConversationId && sendMessageMutation.mutate(draft.trim())}
                            disabled={!selectedConversationId || !draft.trim() || sendMessageMutation.isPending}
                            className="px-4 py-2 text-sm font-semibold bg-[#4f6ef7] text-white rounded-md hover:bg-[#3a56e0] disabled:opacity-50"
                        >
                            Send
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Chat;
