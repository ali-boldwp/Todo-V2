import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Drawer from './Drawer';
import RichTextEditor from './RichTextEditor';
import { updateTask } from '../services/task';
import {
    Flag,
    CheckCircle2,
    Check,
    Loader2,
    Info,
    GitBranch,
} from 'lucide-react';
import { OutputData } from '@editorjs/editorjs';

interface TaskDetailsDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    task: any; // The task to display details for
}

const PRIORITY_STYLES: any = {
    low: { label: 'Low', color: 'text-blue-500', bg: 'bg-blue-50' },
    medium: { label: 'Medium', color: 'text-amber-500', bg: 'bg-amber-50' },
    high: { label: 'High', color: 'text-red-500', bg: 'bg-red-50' },
    urgent: { label: 'Urgent', color: 'text-purple-500', bg: 'bg-purple-50' },
};

const STATUS_STYLES: any = {
    todo: { label: 'To Do', color: 'text-gray-500' },
    in_progress: { label: 'In Progress', color: 'text-blue-500' },
    review: { label: 'Review', color: 'text-amber-500' },
    done: { label: 'Done', color: 'text-green-500' },
};

const TaskDetailsDrawer: React.FC<TaskDetailsDrawerProps> = ({ isOpen, onClose, task }) => {
    const queryClient = useQueryClient();
    const [clarificationText, setClarificationText] = useState<OutputData | undefined>(task?.clarificationText);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const isInitialized = React.useRef(false);
    const debounceTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        isInitialized.current = false;
        if (task) {
            setClarificationText(task.clarificationText);
        } else {
            setClarificationText(undefined);
        }
        setSaveStatus('idle');
        const t = setTimeout(() => { isInitialized.current = true; }, 1000);
        return () => clearTimeout(t);
    }, [task, isOpen]);

    const mutation = useMutation({
        mutationFn: (data: any) => updateTask(task._id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
        },
        onError: () => setSaveStatus('idle'),
    });

    const scheduleAutoSave = React.useCallback((text: OutputData | undefined) => {
        if (!task || !isInitialized.current) return;
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        setSaveStatus('saving');
        debounceTimer.current = setTimeout(() => {
            mutation.mutate({
                clarificationText: text,
                needsClarification: true,
            });
        }, 800);
    }, [task]);

    useEffect(() => {
        if (isInitialized.current) {
            scheduleAutoSave(clarificationText);
        }
    }, [clarificationText]);

    if (!task) return null;

    return (
        <Drawer
            isOpen={isOpen}
            onClose={onClose}
            title={`TASK DETAILS - ${task._id.slice(-4).toUpperCase()}`}
            size="2xl"
        >
            <div className="flex flex-col h-full bg-white">
                <div className="pb-24">
                    {/* Header: Title */}
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-gray-900 leading-tight">
                            {task.title}
                        </h1>
                    </div>

                    {/* Properties Grid (Read-only view) */}
                    <div className="space-y-3 mb-8 bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Properties</h4>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Status */}
                            <div className="flex items-center">
                                <div className="w-24 flex items-center space-x-2 text-[13px] text-gray-500">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Status</span>
                                </div>
                                <div className={`text-[13px] font-medium ${STATUS_STYLES[task.status]?.color || 'text-gray-900'}`}>
                                    {STATUS_STYLES[task.status]?.label || task.status}
                                </div>
                            </div>

                            {/* Priority */}
                            <div className="flex items-center">
                                <div className="w-24 flex items-center space-x-2 text-[13px] text-gray-500">
                                    <Flag className="w-3.5 h-3.5" />
                                    <span>Priority</span>
                                </div>
                                <div className={`text-[13px] font-medium px-2 py-0.5 rounded-md ${PRIORITY_STYLES[task.priority]?.bg || 'bg-gray-100'} ${PRIORITY_STYLES[task.priority]?.color || 'text-gray-900'}`}>
                                    {PRIORITY_STYLES[task.priority]?.label || task.priority}
                                </div>
                            </div>
                        </div>

                        {/* GitHub Branch */}
                        {task.githubBranch && (
                            <div className="flex items-center mt-2 pt-3 border-t border-gray-100">
                                <div className="w-24 flex items-center space-x-2 text-[13px] text-gray-500">
                                    <GitBranch className="w-3.5 h-3.5" />
                                    <span>Branch</span>
                                </div>
                                <code
                                    className="text-[12px] font-mono bg-gray-100 text-indigo-700 px-2 py-0.5 rounded cursor-pointer hover:bg-indigo-50 transition-colors"
                                    onClick={() => { navigator.clipboard.writeText(task.githubBranch); }}
                                    title="Click to copy branch name"
                                >
                                    {task.githubBranch}
                                </code>
                            </div>
                        )}
                    </div>

                    {/* Task Description */}
                    {task.description && (
                        <div className="mb-8">
                            <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Description</h4>
                            <div className="text-gray-700 leading-relaxed pointer-events-none">
                                <RichTextEditor
                                    key={`description-${task._id}`}
                                    holder={`description-reader-${task._id}`}
                                    data={task.description}
                                    onChange={() => { }}
                                    readOnly={true}
                                />
                            </div>
                        </div>
                    )}

                    {/* Clarification Editor (The only editable part here) */}
                    <div className="space-y-2 mt-8">
                        <div className="flex items-center space-x-2 text-red-500 mb-2 border-b border-gray-50 pb-2">
                            <Info className="w-4 h-4" />
                            <h4 className="text-sm font-bold">Clarification Notes</h4>
                        </div>
                        <p className="text-xs text-gray-500 mb-4">
                            Add detailed notes or requirements that need clarification for this task.
                        </p>

                        <div className="border border-gray-200 rounded-xl p-2 min-h-[200px] focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all">
                            <RichTextEditor
                                key={`clarification-${task._id}`}
                                holder={`clarification-editor-${task._id}`}
                                data={clarificationText}
                                onChange={setClarificationText}
                                placeholder="What exactly do users want to know about the task? Add clarification details here..."
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Sticky Action Footer */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 flex justify-between items-center z-20">
                <div className="flex items-center space-x-2 px-2">
                    {saveStatus === 'saving' && (
                        <>
                            <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin" />
                            <span className="text-[11px] text-gray-400 font-medium">Saving…</span>
                        </>
                    )}
                    {saveStatus === 'saved' && (
                        <>
                            <Check className="w-3.5 h-3.5 text-green-500" />
                            <span className="text-[11px] text-green-600 font-medium">Saved</span>
                        </>
                    )}
                    {saveStatus === 'idle' && (
                        <span className="text-[10px] text-gray-400 font-medium">
                            Auto-saving clarification...
                        </span>
                    )}
                </div>
                <div className="flex space-x-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 rounded-md transition-all"
                    >
                        Close
                    </button>
                </div>
            </div>
        </Drawer>
    );
};

export default TaskDetailsDrawer;
