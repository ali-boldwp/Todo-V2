import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Comment {
    _id: string;
    content: string;
    userId: {
        _id: string;
        firstName: string;
        lastName: string;
        email: string;
    };
    createdAt: string;
}

const TaskComments: React.FC<{ taskId: string }> = ({ taskId }) => {
    const [newComment, setNewComment] = useState('');
    const queryClient = useQueryClient();

    const { data: comments, isLoading } = useQuery<Comment[]>({
        queryKey: ['comments', taskId],
        queryFn: async () => {
            const res = await api.get(`/comments/${taskId}`);
            return res.data;
        },
        enabled: !!taskId,
    });

    const commentMutation = useMutation({
        mutationFn: async (content: string) => {
            const res = await api.post(`/comments/${taskId}`, { content });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['comments', taskId] });
            setNewComment('');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || commentMutation.isPending) return;
        commentMutation.mutate(newComment.trim());
    };

    if (isLoading) return <div className="p-4 text-center text-gray-400 text-sm">Loading comments...</div>;

    return (
        <div className="flex flex-col h-full bg-gray-50/50 rounded-xl overflow-hidden border border-gray-100">
            <div className="px-4 py-3 border-b border-gray-100 bg-white">
                <h3 className="text-sm font-semibold text-gray-700">Comments</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {comments?.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-xs text-gray-400 italic">No comments yet. Start the conversation!</p>
                    </div>
                ) : (
                    comments?.map((comment) => (
                        <div key={comment._id} className="flex space-x-3">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                                {comment.userId.firstName[0]}{comment.userId.lastName[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2">
                                    <span className="text-xs font-bold text-gray-900">
                                        {comment.userId.firstName} {comment.userId.lastName}
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
                    ))
                )}
            </div>

            <form onSubmit={handleSubmit} className="p-4 bg-white border-t border-gray-100">
                <div className="relative">
                    <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Write a comment..."
                        className="w-full pl-4 pr-12 py-2.5 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                    />
                    <button
                        type="submit"
                        disabled={!newComment.trim() || commentMutation.isPending}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:bg-gray-300 transition-all active:scale-95"
                    >
                        <Send size={16} />
                    </button>
                </div>
            </form>
        </div>
    );
};

export default TaskComments;
