import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createOrGetConversation, getChatUsers, getConversationMessages, getConversations, sendConversationMessage } from '../services/chat';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const Chat: React.FC = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const { joinConversation, leaveConversation } = useSocket();
    const [selectedConversationId, setSelectedConversationId] = useState<string>('');
    const [draft, setDraft] = useState('');

    const { data: conversations = [] } = useQuery({
        queryKey: ['chat', 'conversations'],
        queryFn: getConversations,
    });

    const { data: chatUsers = [] } = useQuery({
        queryKey: ['chat', 'users'],
        queryFn: getChatUsers,
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

    const sendMessageMutation = useMutation({
        mutationFn: (text: string) => sendConversationMessage(selectedConversationId, text),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['chat', 'messages', selectedConversationId] });
            queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
            setDraft('');
        },
        onError: (error: any) => alert(error?.response?.data?.message || 'Failed to send message'),
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

    const selectedConversation = useMemo(
        () => conversations.find((c: any) => c._id === selectedConversationId),
        [conversations, selectedConversationId]
    );

    const otherParticipant = selectedConversation?.participants?.find((p: any) => p._id !== user?.id);
    const isInternal = ['admin', 'manager', 'member'].includes(user?.role || '');

    if (!isInternal) {
        return <div className="p-6 text-sm text-gray-500">Chat is available only for internal team.</div>;
    }

    return (
        <div className="h-full flex">
            <div className="w-80 border-r border-gray-200 bg-white flex flex-col">
                <div className="p-4 border-b border-gray-100">
                    <h1 className="text-lg font-semibold text-gray-900">Team Chat</h1>
                    <p className="text-xs text-gray-500 mt-1">Start or continue conversations</p>
                    <div className="mt-3">
                        <select
                            defaultValue=""
                            onChange={(e) => {
                                const participantId = e.target.value;
                                if (!participantId) return;
                                createConversationMutation.mutate(participantId);
                                e.target.value = '';
                            }}
                            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="">New conversation...</option>
                            {chatUsers.map((u: any) => (
                                <option key={u._id} value={u._id}>
                                    {u.firstName} {u.lastName} ({u.role})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="flex-1 overflow-auto">
                    {conversations.map((c: any) => {
                        const other = c.participants?.find((p: any) => p._id !== user?.id);
                        const active = c._id === selectedConversationId;
                        return (
                            <button
                                key={c._id}
                                onClick={() => setSelectedConversationId(c._id)}
                                className={`w-full text-left px-4 py-3 border-b border-gray-100 transition-colors ${active ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}
                            >
                                <p className="text-sm font-semibold text-gray-900">{other ? `${other.firstName} ${other.lastName}` : 'Conversation'}</p>
                                <p className="text-xs text-gray-500 truncate mt-0.5">{c.lastMessage || 'No messages yet'}</p>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="flex-1 flex flex-col bg-white">
                <div className="px-5 py-4 border-b border-gray-100">
                    <h2 className="text-sm font-semibold text-gray-900">
                        {otherParticipant ? `${otherParticipant.firstName} ${otherParticipant.lastName}` : 'Select conversation'}
                    </h2>
                    {otherParticipant?.role && <p className="text-xs text-gray-500 mt-0.5">{otherParticipant.role}</p>}
                </div>

                <div className="flex-1 overflow-auto p-5 space-y-3 bg-gray-50/40">
                    {!selectedConversationId ? (
                        <p className="text-sm text-gray-500">Pick a conversation to start chatting.</p>
                    ) : messages.length === 0 ? (
                        <p className="text-sm text-gray-500">No messages yet.</p>
                    ) : (
                        messages.map((m: any) => {
                            const mine = m.senderId?._id === user?.id;
                            return (
                                <div key={m._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[70%] px-3 py-2 rounded-2xl ${mine ? 'bg-indigo-600 text-white' : 'bg-white text-gray-800 border border-gray-200'}`}>
                                        <p className="text-xs opacity-80 mb-1">
                                            {m.senderId ? `${m.senderId.firstName} ${m.senderId.lastName}` : 'User'}
                                        </p>
                                        <p className="text-sm whitespace-pre-wrap">{m.text}</p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="p-4 border-t border-gray-100">
                    <div className="flex gap-2">
                        <input
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    if (draft.trim() && selectedConversationId) sendMessageMutation.mutate(draft.trim());
                                }
                            }}
                            placeholder={selectedConversationId ? 'Type a message...' : 'Select a conversation first'}
                            disabled={!selectedConversationId}
                            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                        />
                        <button
                            onClick={() => draft.trim() && selectedConversationId && sendMessageMutation.mutate(draft.trim())}
                            disabled={!selectedConversationId || !draft.trim() || sendMessageMutation.isPending}
                            className="px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
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
