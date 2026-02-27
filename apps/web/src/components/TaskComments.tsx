import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { formatDistanceToNow } from 'date-fns';

interface Comment {
    _id: string;
    content: string;
    userId: {
        _id: string;
        firstName: string;
        lastName: string;
        email: string;
        role?: 'admin' | 'manager' | 'member' | 'client';
    };
    createdAt: string;
}

const TaskComments: React.FC<{
    taskId: string;
    type?: 'general' | 'clarification';
    submitLabel?: string;
    placeholder?: string;
}> = ({ taskId, type = 'general', submitLabel = 'Comment', placeholder = 'Add comment' }) => {
    const [newComment, setNewComment] = useState('');
    const queryClient = useQueryClient();

    const { data: comments, isLoading } = useQuery<Comment[]>({
        queryKey: ['comments', taskId, type],
        queryFn: async () => {
            const res = await api.get(`/comments/${taskId}`, { params: { type } });
            return res.data;
        },
        enabled: !!taskId,
    });

    const commentMutation = useMutation({
        mutationFn: async (content: string) => {
            const res = await api.post(`/comments/${taskId}`, { content, type });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['comments', taskId, type] });
            setNewComment('');
        },
    });

    const getRoleChip = (role?: string) => {
        if (role === 'admin') return { label: 'Admin', cls: 'bg-red-50 text-red-700 border-red-100' };
        if (role === 'client') return { label: 'Client', cls: 'bg-blue-50 text-blue-700 border-blue-100' };
        if (role === 'manager' || role === 'member') return { label: 'Team', cls: 'bg-emerald-50 text-emerald-700 border-emerald-100' };
        return { label: 'User', cls: 'bg-gray-50 text-gray-600 border-gray-100' };
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || commentMutation.isPending) return;
        commentMutation.mutate(newComment.trim());
    };

    if (isLoading) return <div className="p-4 text-center text-gray-400 text-xs">Loading activity...</div>;

    return (
        <div className="space-y-6">
            <div className="space-y-6">
                {comments?.map((comment) => (
                    <div key={comment._id} className="flex space-x-3 group">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-[10px] mt-0.5">
                            {comment.userId.firstName[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                                <span className="text-xs font-bold text-gray-900">
                                    {comment.userId.firstName} {comment.userId.lastName}
                                </span>
                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${getRoleChip(comment.userId.role).cls}`}>
                                    {getRoleChip(comment.userId.role).label}
                                </span>
                                <span className="text-[10px] text-gray-400">
                                    {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                                </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                                {comment.content}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Styled Add Comment Box matching the image */}
            <form onSubmit={handleSubmit} className="relative mt-8 group">
                <div className="flex space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 font-bold text-[10px] mt-2">
                        +
                    </div>
                    <div className="flex-1 bg-gray-50/50 rounded-lg border border-gray-100 focus-within:bg-white focus-within:border-gray-200 transition-all p-3">
                        <input
                            type="text"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder={placeholder}
                            className="w-full bg-transparent border-none p-0 text-sm focus:ring-0 placeholder-gray-400 outline-none"
                        />
                        <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center space-x-2 text-gray-400">
                                {/* Placeholders for rich text icons as seen in the image */}
                                <span className="text-xs font-bold p-1 hover:text-gray-600 cursor-pointer transition-colors">B</span>
                                <span className="text-xs italic p-1 hover:text-gray-600 cursor-pointer transition-colors">i</span>
                                <span className="text-xs underline p-1 hover:text-gray-600 cursor-pointer transition-colors">U</span>
                            </div>
                            <button
                                type="submit"
                                disabled={!newComment.trim() || commentMutation.isPending}
                                className="px-3 py-1 bg-gray-100 text-gray-400 text-xs font-bold rounded hover:bg-gray-200 hover:text-gray-900 disabled:opacity-50 transition-all"
                            >
                                {submitLabel}
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default TaskComments;
