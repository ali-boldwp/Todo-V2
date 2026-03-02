import React from 'react';
import Drawer from './Drawer';
import RichTextEditor from './RichTextEditor';
import TaskComments from './TaskComments';
import {
    Flag,
    CheckCircle2,
    Info,
    GitBranch,
} from 'lucide-react';

interface TaskDetailsDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    task: any;
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
    under_verification: { label: 'Under Verification', color: 'text-violet-600' },
    clarification: { label: 'Clarification', color: 'text-red-600' },
    clarified: { label: 'Clarified', color: 'text-emerald-600' },
};

const TaskDetailsDrawer: React.FC<TaskDetailsDrawerProps> = ({ isOpen, onClose, task }) => {
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
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-gray-900 leading-tight">
                            {task.title}
                        </h1>
                    </div>

                    <div className="space-y-3 mb-8 bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Properties</h4>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center">
                                <div className="w-24 flex items-center space-x-2 text-[13px] text-gray-500">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Status</span>
                                </div>
                                <div className={`text-[13px] font-medium ${STATUS_STYLES[task.status]?.color || 'text-gray-900'}`}>
                                    {STATUS_STYLES[task.status]?.label || task.status}
                                </div>
                            </div>

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

                    <div className="space-y-2 mt-8">
                        <div className="flex items-center space-x-2 text-red-500 ">
                            <Info className="w-4 h-4" />
                            <h4 className="text-sm font-bold">Clarification</h4>
                        </div>
                        <p className="text-xs text-gray-500">
                            Write your clarification in chat.
                        </p>
                    </div>

                    <div className="space-y-4 pt-6 ">
                        <TaskComments
                            taskId={task._id}
                            type="clarification"
                            submitLabel="Send Message"
                            placeholder="Write clarification message..."
                        />
                    </div>
                </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 flex justify-between items-center z-20">
                <div className="text-[10px] text-gray-400 font-medium px-2">
                    Clarification messages are sent from chat
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
