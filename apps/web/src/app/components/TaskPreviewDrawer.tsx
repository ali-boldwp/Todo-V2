import { useState, useEffect } from 'react';
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
  Loader2,
  Check,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProjects } from '../../services/core';
import { getTeamMembers } from '../../services/team';
import { startTaskWork, pauseTaskWork, resumeTaskWork, finishTaskWork } from '../../services/task';
import { OutputData } from '@editorjs/editorjs';
import { CodexTaskChat } from './CodexTaskChat';
import clsx from 'clsx';

type FinishFlowPhase = 'running' | 'conflict' | 'error' | 'success';

interface FinishFlowErrorDetail {
    message: string;
    code?: string;
    mergeStep?: string;
    branch?: string;
    details?: string;
    conflictUrl?: string;
}

interface FinishFlowState {
    isOpen: boolean;
    phase: FinishFlowPhase;
    progressStep: number;
    error: FinishFlowErrorDetail | null;
    hasOpenedResolveUrl: boolean;
}

type TaskActionType = 'start' | 'pause' | 'resume' | 'approve' | 'reject' | 'fix_branch';
type TaskActionModalPhase = 'running' | 'success' | 'error';

interface TaskActionModalState {
    isOpen: boolean;
    phase: TaskActionModalPhase;
    action: TaskActionType | null;
    title: string;
    message: string;
    details?: string;
}

const FINISH_PROGRESS_STEPS = [
    'Preparing finish request',
    'Syncing dev into task branch',
    'Merging task branch into dev',
    'Assigning verifier and moving task to verification',
];

interface TaskPreviewDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  task: any;
}

export function TaskPreviewDrawer({ isOpen, onClose, task }: TaskPreviewDrawerProps) {
  const queryClient = useQueryClient();
  const [description, setDescription] = useState<OutputData>(task?.description || { blocks: [] });
  const [isTaskRunning, setIsTaskRunning] = useState(task?.activeWorkerId ? true : false);
  const [isPaused, setIsPaused] = useState(task?.isWorkPaused || false);

  const [isFinishConfirmOpen, setIsFinishConfirmOpen] = useState(false);
  const [taskActionModal, setTaskActionModal] = useState<TaskActionModalState>({
      isOpen: false,
      phase: 'running',
      action: null,
      title: '',
      message: '',
  });
  const [finishFlow, setFinishFlow] = useState<FinishFlowState>({
      isOpen: false,
      phase: 'running',
      progressStep: 0,
      error: null,
      hasOpenedResolveUrl: false,
  });

  useEffect(() => {
    if (task) {
      setDescription(task.description || { blocks: [] });
      setIsTaskRunning(!!task.activeWorkerId);
      setIsPaused(!!task.isWorkPaused);
    }
  }, [task]);

  useEffect(() => {
      if (!finishFlow.isOpen || finishFlow.phase !== 'running') return;
      const interval = setInterval(() => {
          setFinishFlow((prev) => ({
              ...prev,
              progressStep: Math.min(prev.progressStep + 1, FINISH_PROGRESS_STEPS.length - 1),
          }));
      }, 1400);
      return () => clearInterval(interval);
  }, [finishFlow.isOpen, finishFlow.phase]);

  const { data: teamMembers = [] } = useQuery({ queryKey: ['teamMembers'], queryFn: getTeamMembers });
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: getProjects });

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const openTaskActionRunning = (action: TaskActionType, title: string, message: string) => {
      setTaskActionModal({
          isOpen: true,
          phase: 'running',
          action,
          title,
          message,
      });
  };

  const markTaskActionSuccess = (title: string, message: string) => {
      setTaskActionModal((prev) => ({
          ...prev,
          isOpen: true,
          phase: 'success',
          title,
          message,
          details: undefined,
      }));
  };

  const markTaskActionError = (title: string, message: string, details?: string) => {
      setTaskActionModal((prev) => ({
          ...prev,
          isOpen: true,
          phase: 'error',
          title,
          message,
          details,
      }));
  };

  const startMutation = useMutation({
    mutationFn: () => {
        if (!task?._id) return Promise.reject(new Error('No task selected'));
        return startTaskWork(task._id);
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        setIsTaskRunning(true);
        setIsPaused(false);
        markTaskActionSuccess('Task Started', 'Task work has started successfully.');
        
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
    },
    onError: (error: any) => {
        markTaskActionError('Failed to Start Task', error?.response?.data?.message || 'Failed to start task');
    },
  });

  const pauseMutation = useMutation({
    mutationFn: () => {
        if (!task?._id) return Promise.reject(new Error('No task selected'));
        return pauseTaskWork(task._id);
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        setIsPaused(true);
        markTaskActionSuccess('Task Paused', 'Task work is paused.');
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
    },
    onError: (error: any) => {
        markTaskActionError('Failed to Pause Task', error?.response?.data?.message || 'Failed to pause task');
    },
  });

  const resumeMutation = useMutation({
    mutationFn: () => {
        if (!task?._id) return Promise.reject(new Error('No task selected'));
        return resumeTaskWork(task._id);
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        setIsPaused(false);
        markTaskActionSuccess('Task Resumed', 'Task work has resumed.');
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
    },
    onError: (error: any) => {
        markTaskActionError('Failed to Resume Task', error?.response?.data?.message || 'Failed to resume task');
    },
  });

  const finishMutation = useMutation({
    mutationFn: () => {
        if (!task?._id) return Promise.reject(new Error('No task selected'));
        return finishTaskWork(task._id);
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        setIsTaskRunning(false);
        setIsPaused(false);
        setFinishFlow({
            isOpen: true,
            phase: 'success',
            progressStep: FINISH_PROGRESS_STEPS.length - 1,
            error: null,
            hasOpenedResolveUrl: false,
        });
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
    },
    onError: (error: any) => {
        const data = error?.response?.data || {};
        const conflictUrl = data?.pullRequestUrl || data?.compareUrl || data?.resolveUrl;
        const mergeStep = String(data?.mergeStep || '');
        const stepIndex = mergeStep === 'dev_to_task' ? 1 : mergeStep === 'task_to_dev' ? 2 : 0;
        setFinishFlow({
            isOpen: true,
            phase: conflictUrl ? 'conflict' : 'error',
            progressStep: stepIndex,
            error: {
                message: data?.message || 'Failed to finish task',
                code: data?.code,
                mergeStep: data?.mergeStep,
                branch: data?.branch,
                details: data?.details,
                conflictUrl,
            },
            hasOpenedResolveUrl: false,
        });
    },
  });

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

  const statusConfig = getStatusConfig(task.status);
  const priorityConfig = getPriorityConfig(task.priority);
  const StatusIcon = statusConfig.icon;
  const PriorityIcon = priorityConfig.icon;

  const handleStartTask = () => {
      openTaskActionRunning('start', 'Starting Task', 'System is assigning you as active worker and starting timer.');
      startMutation.mutate();
  };

  const handlePauseTask = () => {
      openTaskActionRunning('pause', 'Pausing Task', 'System is pausing timer and saving elapsed work.');
      pauseMutation.mutate();
  };

  const handleResumeTask = () => {
      openTaskActionRunning('resume', 'Resuming Task', 'System is resuming timer for this task.');
      resumeMutation.mutate();
  };

  const handleFinishTask = () => {
      setIsFinishConfirmOpen(true);
  };
  
  const runFinishFlow = () => {
      setIsFinishConfirmOpen(false);
      setFinishFlow({
          isOpen: true,
          phase: 'running',
          progressStep: 0,
          error: null,
          hasOpenedResolveUrl: false,
      });
      finishMutation.mutate();
  };

  return (
    <>
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

        {/* Task Properties Panel */}
        <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-1.5 flex flex-col gap-1">
          
          {/* Status Row */}
          <div className="flex items-center p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <div className="w-1/3 flex items-center gap-2 text-sm text-slate-500">
              <AlertCircle className="w-4 h-4 text-slate-400" />
              <span>Status</span>
            </div>
            <div className="w-2/3 flex items-center">
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-${statusConfig.color}-100 text-${statusConfig.color}-700 font-medium text-xs border border-${statusConfig.color}-200`}>
                <StatusIcon className="w-3.5 h-3.5" />
                {statusConfig.label}
              </div>
            </div>
          </div>

          {/* Priority Row */}
          <div className="flex items-center p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <div className="w-1/3 flex items-center gap-2 text-sm text-slate-500">
              <Flag className="w-4 h-4 text-slate-400" />
              <span>Priority</span>
            </div>
            <div className="w-2/3 flex items-center">
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-${priorityConfig.color}-100 text-${priorityConfig.color}-700 font-medium text-xs border border-${priorityConfig.color}-200`}>
                <PriorityIcon className="w-3.5 h-3.5" />
                {priorityConfig.label}
              </div>
            </div>
          </div>

          {/* Assignee Row */}
          <div className="flex items-center p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <div className="w-1/3 flex items-center gap-2 text-sm text-slate-500">
              <User className="w-4 h-4 text-slate-400" />
              <span>Assignee</span>
            </div>
            <div className="w-2/3 flex items-center">
              {assignee ? (
                <div className="inline-flex items-center gap-2 px-2 py-1 rounded-md hover:bg-slate-200 transition-colors cursor-pointer -ml-2">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-[10px]">
                    {assignee.firstName[0]}{assignee.lastName[0]}
                  </div>
                  <span className="text-sm font-medium text-slate-700">{assignee.firstName} {assignee.lastName}</span>
                </div>
              ) : (
                <span className="text-sm text-slate-400 italic">Unassigned</span>
              )}
            </div>
          </div>

          {/* Verifier Row */}
          <div className="flex items-center p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <div className="w-1/3 flex items-center gap-2 text-sm text-slate-500">
              <CheckCircle2 className="w-4 h-4 text-slate-400" />
              <span>Verifier</span>
            </div>
            <div className="w-2/3 flex items-center">
              {verifier ? (
                <div className="inline-flex items-center gap-2 px-2 py-1 rounded-md hover:bg-slate-200 transition-colors cursor-pointer -ml-2">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-[10px]">
                    {verifier.firstName[0]}{verifier.lastName[0]}
                  </div>
                  <span className="text-sm font-medium text-slate-700">{verifier.firstName} {verifier.lastName}</span>
                </div>
              ) : (
                <span className="text-sm text-slate-400 italic">Unassigned</span>
              )}
            </div>
          </div>

          {/* Due Date Row */}
          <div className="flex items-center p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <div className="w-1/3 flex items-center gap-2 text-sm text-slate-500">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>Due Date</span>
            </div>
            <div className="w-2/3 flex items-center text-sm font-medium text-slate-700">
              {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric'
              }) : <span className="text-slate-400 italic font-normal">No due date</span>}
            </div>
          </div>

          {/* Time Tracked Row */}
          <div className="flex items-center p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <div className="w-1/3 flex items-center gap-2 text-sm text-slate-500">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>Time Tracked</span>
            </div>
            <div className="w-2/3 flex items-center gap-3">
              <span className="text-sm font-medium text-slate-700">
                {task.totalWorkedSeconds ? formatDuration(task.totalWorkedSeconds) : '0h 0m'}
              </span>
              {task.activeWorkerId && (
                <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full animate-pulse">
                  <Play className="w-3 h-3 flex-shrink-0" />
                  Running
                </span>
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
                key={`viewer-${task._id}`}
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
                disabled={startMutation.isPending}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all group disabled:opacity-50"
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
                          ? "Resume when you're ready to continue" 
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
                      disabled={pauseMutation.isPending}
                      className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-50 hover:bg-amber-100 border-2 border-amber-200 hover:border-amber-300 text-amber-700 font-semibold transition-all disabled:opacity-50"
                    >
                      <Pause className="w-4 h-4" />
                      <span>Pause</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleResumeTask}
                      disabled={resumeMutation.isPending}
                      className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 hover:border-blue-300 text-blue-700 font-semibold transition-all disabled:opacity-50"
                    >
                      <Play className="w-4 h-4" />
                      <span>Resume</span>
                    </button>
                  )}

                  {/* Finish Button */}
                  <button
                    onClick={handleFinishTask}
                    disabled={finishMutation.isPending}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50"
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

            {/* MODALS */}
            {isFinishConfirmOpen && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100]">
                    <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-900">Before Finishing Task</h3>
                        <p className="text-sm text-gray-600 mt-2">
                            Confirm that you have pushed your latest code to GitHub.
                        </p>
                        {task?.githubBranch && (
                            <div className="mt-3 px-3 py-2 rounded-md bg-indigo-50 border border-indigo-100 text-xs text-indigo-800 font-medium">
                                Branch: <span className="font-mono">{task.githubBranch}</span>
                            </div>
                        )}
                        <div className="mt-5 flex gap-2 justify-end">
                            <button
                                onClick={() => setIsFinishConfirmOpen(false)}
                                className="px-4 py-2 text-sm border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    runFinishFlow();
                                }}
                                disabled={finishMutation.isPending}
                                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                {finishMutation.isPending ? 'Finishing...' : 'Yes, Finish Task'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {finishFlow.isOpen && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100]">
                    <div className="bg-white rounded-xl w-full max-w-2xl p-6 shadow-xl border border-gray-100">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">
                                    {finishFlow.phase === 'running' && 'Finishing Task'}
                                    {finishFlow.phase === 'success' && 'Task Finished Successfully'}
                                    {finishFlow.phase === 'conflict' && 'Merge Conflict Detected'}
                                    {finishFlow.phase === 'error' && 'Finish Task Failed'}
                                </h3>
                                <p className="text-sm text-gray-600 mt-1">
                                    {finishFlow.phase === 'running' && 'System is validating branch state, syncing code, and preparing verification assignment.'}
                                    {finishFlow.phase === 'success' && 'Task moved to verification and verifier assignment is complete.'}
                                    {finishFlow.phase === 'conflict' && 'Resolve conflicts in GitHub, then confirm below to retry finish.'}
                                    {finishFlow.phase === 'error' && 'System could not complete finish flow. Review technical details below.'}
                                </p>
                            </div>
                            {finishFlow.phase === 'running' ? (
                                <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                            ) : finishFlow.phase === 'success' ? (
                                <CheckCircle2 className="w-6 h-6 text-green-600" />
                            ) : (
                                <AlertCircle className="w-6 h-6 text-red-600" />
                            )}
                        </div>

                        <div className="mt-5 space-y-2">
                            {FINISH_PROGRESS_STEPS.map((step, idx) => {
                                const isDone = finishFlow.phase === 'success' || idx < finishFlow.progressStep;
                                const isCurrent = idx === finishFlow.progressStep && finishFlow.phase === 'running';
                                return (
                                    <div key={step} className="flex items-center gap-3 px-3 py-2 rounded-lg border border-gray-100 bg-gray-50">
                                        <div className="w-5 h-5 flex items-center justify-center">
                                            {isDone ? (
                                                <Check className="w-4 h-4 text-green-600" />
                                            ) : isCurrent ? (
                                                <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                                            ) : (
                                                <div className="w-2 h-2 rounded-full bg-gray-300" />
                                            )}
                                        </div>
                                        <span className={clsx('text-sm', isDone ? 'text-green-700 font-medium' : isCurrent ? 'text-blue-700 font-medium' : 'text-gray-600')}>
                                            {step}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {(finishFlow.phase === 'conflict' || finishFlow.phase === 'error') && finishFlow.error && (
                            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 space-y-2">
                                <p className="text-sm font-semibold text-red-800">{finishFlow.error.message}</p>
                                {finishFlow.error.mergeStep && <p className="text-xs text-red-700">Step: {finishFlow.error.mergeStep}</p>}
                                {finishFlow.error.code && <p className="text-xs text-red-700">Code: {finishFlow.error.code}</p>}
                                {finishFlow.error.branch && <p className="text-xs text-red-700">Branch: {finishFlow.error.branch}</p>}
                                {finishFlow.error.details && <p className="text-xs text-red-700 break-words">Details: {finishFlow.error.details}</p>}
                            </div>
                        )}

                        <div className="mt-6 flex items-center justify-end gap-2">
                            {finishFlow.phase === 'conflict' && finishFlow.error?.conflictUrl && (
                                <>
                                    <button
                                        onClick={() => {
                                            if (finishFlow.error?.conflictUrl) {
                                                window.open(finishFlow.error.conflictUrl, '_blank', 'noopener,noreferrer');
                                                setFinishFlow((prev) => ({ ...prev, hasOpenedResolveUrl: true }));
                                            }
                                        }}
                                        className="px-4 py-2 text-sm border border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-50"
                                    >
                                        Open Resolve URL
                                    </button>
                                    <button
                                        onClick={() => {
                                            setFinishFlow((prev) => ({
                                                ...prev,
                                                phase: 'running',
                                                progressStep: prev.error?.mergeStep === 'task_to_dev' ? 2 : 1,
                                                error: null,
                                            }));
                                            finishMutation.mutate();
                                        }}
                                        disabled={!finishFlow.hasOpenedResolveUrl || finishMutation.isPending}
                                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        I Resolved Conflict, Retry
                                    </button>
                                </>
                            )}
                            {finishFlow.phase === 'running' ? (
                                <button
                                    disabled
                                    className="px-4 py-2 text-sm border border-gray-200 text-gray-400 rounded-lg cursor-not-allowed"
                                >
                                    Processing...
                                </button>
                            ) : (
                                <button
                                    onClick={() => setFinishFlow((prev) => ({ ...prev, isOpen: false }))}
                                    className="px-4 py-2 text-sm border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
                                >
                                    Close
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {taskActionModal.isOpen && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100]">
                    <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-xl border border-gray-100">
                        <div className="flex items-start gap-3">
                            {taskActionModal.phase === 'running' ? (
                                <Loader2 className="w-5 h-5 text-blue-600 animate-spin mt-0.5" />
                            ) : taskActionModal.phase === 'success' ? (
                                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                            ) : (
                                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                            )}
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-gray-900">{taskActionModal.title}</h3>
                                <p className="text-sm text-gray-700 mt-1">{taskActionModal.message}</p>
                                {taskActionModal.details && (
                                    <p className="text-xs text-gray-500 mt-2 break-words">{taskActionModal.details}</p>
                                )}
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end">
                            {taskActionModal.phase === 'running' ? (
                                <button
                                    disabled
                                    className="px-4 py-2 text-sm border border-gray-200 text-gray-400 rounded-lg cursor-not-allowed"
                                >
                                    Processing...
                                </button>
                            ) : (
                                <button
                                    onClick={() => setTaskActionModal((prev) => ({ ...prev, isOpen: false }))}
                                    className="px-4 py-2 text-sm border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
                                >
                                    Close
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

    </>
  );
}
