import { useState } from 'react';
import Drawer from './Drawer';
import RichTextEditor from './RichTextEditor';
import { 
  Calendar, 
  Clock, 
  User, 
  CheckCircle2, 
  AlertCircle,
  Play,
  Pause,
  CheckCheck,
  XCircle,
  Flag,
  FolderKanban,
  Sparkles,
  Bot,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getProjects } from '../../services/core';
import { getTeamMembers } from '../../services/team';
import { OutputData } from '@editorjs/editorjs';
import { CodexTaskChat } from './CodexTaskChat';

interface TaskPreviewDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  task: any;
}

export function TaskPreviewDrawer({ isOpen, onClose, task }: TaskPreviewDrawerProps) {
  const [description, setDescription] = useState<OutputData>(task?.description || { blocks: [] });
  const [isTaskRunning, setIsTaskRunning] = useState(task?.activeWorkerId ? true : false);
  const [isPaused, setIsPaused] = useState(task?.isWorkPaused || false);

  const { data: teamMembers = [] } = useQuery({ queryKey: ['teamMembers'], queryFn: getTeamMembers });
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: getProjects });

  if (!task) return null;

  const assignee = teamMembers.find((m: any) => m._id === task.assigneeId?._id || m._id === task.assigneeId);
  const verifier = teamMembers.find((m: any) => m._id === task.verifierId?._id || m._id === task.verifierId);
  const project = projects.find((p: any) => p._id === task.projectId?._id || p._id === task.projectId);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'todo':
        return { label: 'To Do', color: 'slate', icon: AlertCircle };
      case 'in_progress':
        return { label: 'In Progress', color: 'blue', icon: Play };
      case 'under_verification':
        return { label: 'Under Verification', color: 'violet', icon: CheckCheck };
      case 'done':
      case 'completed':
        return { label: 'Done', color: 'emerald', icon: CheckCircle2 };
      case 'clarification':
        return { label: 'Needs Clarification', color: 'amber', icon: XCircle };
      default:
        return { label: status, color: 'slate', icon: AlertCircle };
    }
  };

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'high':
        return { label: 'High', color: 'rose', icon: Flag };
      case 'medium':
        return { label: 'Medium', color: 'amber', icon: Flag };
      case 'low':
        return { label: 'Low', color: 'blue', icon: Flag };
      default:
        return { label: priority, color: 'slate', icon: Flag };
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const statusConfig = getStatusConfig(task.status);
  const priorityConfig = getPriorityConfig(task.priority);
  const StatusIcon = statusConfig.icon;
  const PriorityIcon = priorityConfig.icon;

  const handleStartTask = () => {
    setIsTaskRunning(true);
    setIsPaused(false);
    
    // Console logs
    console.log('🚀 CODEX: Task started', {
      taskId: task._id,
      taskTitle: task.title,
      projectId: task.projectId,
      assignee: assignee ? `${assignee.firstName} ${assignee.lastName}` : 'Unassigned',
      isAIGenerated: !!task.aiPrompt,
      timestamp: new Date().toISOString()
    });
    
    console.log('📡 MESSAGE COMMAND CENTER: Task status updated', {
      event: 'TASK_STARTED',
      taskId: task._id,
      message: `Task "${task.title}" was started from the preview drawer`,
      timestamp: new Date().toISOString()
    });

    // If AI-generated task, log AI agent activation
    if (task.aiPrompt) {
      console.log('🤖 CODEX: AI Agent activated for task', {
        taskId: task._id,
        taskTitle: task.title,
        originalPrompt: task.aiPrompt,
        aiProvider: task.aiProvider || 'default',
        timestamp: new Date().toISOString()
      });

      console.log('📡 MESSAGE COMMAND CENTER: AI guidance loaded', {
        event: 'AI_AGENT_ACTIVATED',
        taskId: task._id,
        hasGuidance: !!task.aiGeneratedContent,
        timestamp: new Date().toISOString()
      });
    }
  };

  const handlePauseTask = () => {
    setIsPaused(true);
    
    console.log('⏸️ CODEX: Task paused', {
      taskId: task._id,
      taskTitle: task.title,
      timestamp: new Date().toISOString()
    });
    
    console.log('📡 MESSAGE COMMAND CENTER: Task paused', {
      event: 'TASK_PAUSED',
      taskId: task._id,
      message: `Task "${task.title}" was paused from the preview drawer`,
      timestamp: new Date().toISOString()
    });
  };

  const handleResumeTask = () => {
    setIsPaused(false);
    
    console.log('▶️ CODEX: Task resumed', {
      taskId: task._id,
      taskTitle: task.title,
      timestamp: new Date().toISOString()
    });
    
    console.log('📡 MESSAGE COMMAND CENTER: Task resumed', {
      event: 'TASK_RESUMED',
      taskId: task._id,
      message: `Task "${task.title}" was resumed from the preview drawer`,
      timestamp: new Date().toISOString()
    });
  };

  const handleFinishTask = () => {
    setIsTaskRunning(false);
    setIsPaused(false);
    
    console.log('✅ CODEX: Task finished', {
      taskId: task._id,
      taskTitle: task.title,
      totalTime: task.totalWorkedSeconds ? formatDuration(task.totalWorkedSeconds) : '0h 0m',
      timestamp: new Date().toISOString()
    });
    
    console.log('📡 MESSAGE COMMAND CENTER: Task completed', {
      event: 'TASK_FINISHED',
      taskId: task._id,
      message: `Task "${task.title}" was finished from the preview drawer`,
      timestamp: new Date().toISOString()
    });
  };

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Task Details" size="2xl">
      <div className="space-y-6">
        {/* Task Title */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">{task.title}</h1>
          {project && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <FolderKanban className="w-4 h-4" />
              <span>{project.name}</span>
            </div>
          )}
        </div>

        {/* Status and Priority */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">
              Status
            </label>
            <div
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 bg-${statusConfig.color}-50 text-${statusConfig.color}-700 border-${statusConfig.color}-200`}
            >
              <StatusIcon className="w-4 h-4" />
              <span className="font-semibold text-sm">{statusConfig.label}</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">
              Priority
            </label>
            <div
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 bg-${priorityConfig.color}-50 text-${priorityConfig.color}-700 border-${priorityConfig.color}-200`}
            >
              <PriorityIcon className="w-4 h-4" />
              <span className="font-semibold text-sm">{priorityConfig.label}</span>
            </div>
          </div>
        </div>

        {/* Assignee and Verifier */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">
              <User className="w-3 h-3 inline mr-1" />
              Assignee
            </label>
            {assignee ? (
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                  {assignee.firstName[0]}{assignee.lastName[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {assignee.firstName} {assignee.lastName}
                  </p>
                  <p className="text-xs text-slate-500">{assignee.role}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic">Not assigned</p>
            )}
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">
              <CheckCircle2 className="w-3 h-3 inline mr-1" />
              Verifier
            </label>
            {verifier ? (
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-semibold text-sm">
                  {verifier.firstName[0]}{verifier.lastName[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {verifier.firstName} {verifier.lastName}
                  </p>
                  <p className="text-xs text-slate-500">{verifier.role}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic">Not assigned</p>
            )}
          </div>
        </div>

        {/* Due Date and Time Tracking */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">
              <Calendar className="w-3 h-3 inline mr-1" />
              Due Date
            </label>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-sm font-semibold text-slate-900">
                {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                }) : 'No due date'}
              </p>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">
              <Clock className="w-3 h-3 inline mr-1" />
              Time Tracked
            </label>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-sm font-semibold text-slate-900">
                {task.totalWorkedSeconds ? formatDuration(task.totalWorkedSeconds) : '0h 0m'}
              </p>
              {task.activeWorkerId && (
                <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                  <Play className="w-3 h-3" />
                  In progress
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Work Status */}
        {task.isWorkPaused && (
          <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-amber-800">
              <Pause className="w-5 h-5" />
              <span className="font-semibold">Work is paused on this task</span>
            </div>
          </div>
        )}

        {task.needsClarification && (
          <div className="bg-rose-50 border-2 border-rose-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-rose-800">
              <AlertCircle className="w-5 h-5" />
              <span className="font-semibold">Needs clarification</span>
            </div>
          </div>
        )}

        {/* AI-Generated Task Badge */}
        {task.aiPrompt && (
          <div className="bg-gradient-to-r from-purple-50 via-pink-50 to-orange-50 border-2 border-purple-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-purple-900">AI-Generated Task</span>
                  <span className="px-2 py-0.5 rounded-md bg-purple-100 border border-purple-200 text-[10px] font-bold text-purple-700">
                    AI ASSISTANT
                  </span>
                </div>
                <p className="text-xs text-purple-700">
                  {isTaskRunning 
                    ? 'CODEX AI Agent is now active and ready to execute this task for you through conversation.'
                    : 'This task was created by the AI chatbot. Start working to activate CODEX AI Agent.'
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {/* CODEX AI Chat System - Only shown when AI task is started */}
        {task.aiPrompt && isTaskRunning && (
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3 block flex items-center gap-2">
              <Bot className="w-3 h-3" />
              CODEX AI Agent - Task Execution
            </label>
            <CodexTaskChat 
              taskId={task._id}
              taskTitle={task.title}
              taskPrompt={task.aiPrompt}
              onTaskComplete={handleFinishTask}
            />
          </div>
        )}

        {/* Regular Description - Only shown when not AI-generated or not started */}
        {(!task.aiPrompt || !isTaskRunning) && (
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3 block">
              Description
            </label>
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
              <RichTextEditor
                holder={`task-description-${task._id}`}
                data={description}
                onChange={setDescription}
                readOnly={true}
                placeholder="No description provided"
              />
            </div>
          </div>
        )}

        {/* Completion Info */}
        {task.finishedAt && (
          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-emerald-800 mb-1">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-semibold">Completed</span>
            </div>
            <p className="text-sm text-emerald-700">
              {new Date(task.finishedAt).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
              })}
            </p>
          </div>
        )}

        {/* Verification Status */}
        {task.verificationStatus && (
          <div className={`border-2 rounded-xl p-4 ${
            task.verificationStatus === 'approved' 
              ? 'bg-emerald-50 border-emerald-200' 
              : task.verificationStatus === 'rejected'
                ? 'bg-rose-50 border-rose-200'
                : 'bg-violet-50 border-violet-200'
          }`}>
            <div className={`flex items-center gap-2 mb-1 ${
              task.verificationStatus === 'approved' 
                ? 'text-emerald-800' 
                : task.verificationStatus === 'rejected'
                  ? 'text-rose-800'
                  : 'text-violet-800'
            }`}>
              <CheckCheck className="w-5 h-5" />
              <span className="font-semibold capitalize">{task.verificationStatus}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {task.status !== 'done' && task.status !== 'completed' && task.verificationStatus !== 'approved' && (
          <div className="pt-6 border-t-2 border-slate-200">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3 block">
              Task Actions
            </label>
            
            {!isTaskRunning ? (
              // Start Button
              <button
                onClick={handleStartTask}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all group"
              >
                <Play className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span>Start Working on This Task</span>
              </button>
            ) : (
              // Pause/Resume and Finish Buttons
              <div className="space-y-3">
                {/* Running Status Banner */}
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                      {isPaused ? (
                        <Pause className="w-5 h-5 text-white" />
                      ) : (
                        <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-blue-900">
                        {isPaused ? 'Task Paused' : 'Task In Progress'}
                      </p>
                      <p className="text-xs text-blue-600">
                        {isPaused 
                          ? 'Resume when you\'re ready to continue' 
                          : 'Timer is running...'
                        }
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Pause/Resume Button */}
                  {!isPaused ? (
                    <button
                      onClick={handlePauseTask}
                      className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-50 hover:bg-amber-100 border-2 border-amber-200 hover:border-amber-300 text-amber-700 font-semibold transition-all"
                    >
                      <Pause className="w-4 h-4" />
                      <span>Pause</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleResumeTask}
                      className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 hover:border-blue-300 text-blue-700 font-semibold transition-all"
                    >
                      <Play className="w-4 h-4" />
                      <span>Resume</span>
                    </button>
                  )}

                  {/* Finish Button */}
                  <button
                    onClick={handleFinishTask}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold shadow-md hover:shadow-lg transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Finish Task</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Drawer>
  );
}
