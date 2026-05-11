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
  GitBranch,
  Trash2,
  Paperclip,
  Download,
  Image as ImageIcon,
  File as FileIcon,
  Plus,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { getProjects } from '../../services/core';
import { getTeamMembers } from '../../services/team';
import { startTaskWork, pauseTaskWork, resumeTaskWork, finishTaskWork, updateTask, approveTaskClient, rejectTaskClient, deleteTask, approveTaskVerification, rejectTaskVerification, startTaskVerification, pauseTaskVerification, resumeTaskVerification, uploadAttachment, deleteAttachment } from '../../services/task';
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

type TaskActionType = 'start' | 'pause' | 'resume' | 'approve' | 'reject' | 'fix_branch' | 'update';
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
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isClientOrAssistant = user?.role === 'client' || user?.role === 'client_assistant';
  const [description, setDescription] = useState<OutputData>(task?.description || { blocks: [] });
  const [prevTaskId, setPrevTaskId] = useState(task?._id);
  const [isTaskRunning, setIsTaskRunning] = useState(task?.activeWorkerId ? true : false);
  const [isPaused, setIsPaused] = useState(task?.isWorkPaused || false);
  const [localSeconds, setLocalSeconds] = useState<number>(task?.totalWorkedSecondsComputed || task?.totalWorkedSeconds || 0);

  // Sync state if task changes while component is mounted
  if (task?._id !== prevTaskId) {
    setPrevTaskId(task?._id);
    setDescription(task?.description || { blocks: [] });
    setIsTaskRunning(task?.activeWorkerId ? true : false);
    setIsPaused(task?.isWorkPaused || false);
    setLocalSeconds(task?.totalWorkedSecondsComputed || task?.totalWorkedSeconds || 0);
  }

  const [isVerificationRunning, setIsVerificationRunning] = useState(task?.activeVerifierId ? true : false);
  const [isVerificationPausedState, setIsVerificationPausedState] = useState(task?.isVerificationPaused || false);
  const [localVerificationSeconds, setLocalVerificationSeconds] = useState<number>(task?.totalVerificationSeconds || 0);

  // Sync verification state if task changes
  if (task?._id !== prevTaskId) {
    setIsVerificationRunning(task?.activeVerifierId ? true : false);
    setIsVerificationPausedState(task?.isVerificationPaused || false);
    setLocalVerificationSeconds(task?.totalVerificationSeconds || 0);
  }

  const [isClarificationModalOpen, setIsClarificationModalOpen] = useState(false);
  const [clarificationText, setClarificationText] = useState('');
  const [isFinishConfirmOpen, setIsFinishConfirmOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
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
      setLocalSeconds(task.totalWorkedSecondsComputed || task.totalWorkedSeconds || 0);
      setIsVerificationRunning(!!task.activeVerifierId);
      setIsVerificationPausedState(!!task.isVerificationPaused);
      setLocalVerificationSeconds(task.totalVerificationSeconds || 0);
    }
  }, [task]);

  useEffect(() => {
    let interval: any;
    if (isTaskRunning && !isPaused) {
      interval = setInterval(() => {
        setLocalSeconds((prev: number) => prev + 1);
      }, 1000);
    }
    if (isVerificationRunning && !isVerificationPausedState) {
      interval = setInterval(() => {
        setLocalVerificationSeconds((prev: number) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTaskRunning, isPaused, isVerificationRunning, isVerificationPausedState]);

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

  useEffect(() => {
    if (!isOpen || !task?._id) return;
    
    const handlePaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      // If typing in input, let normal paste happen (except if it's an image file)
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      
      const items = e.clipboardData?.items;
      if (!items) return;
      
      let fileFound = false;
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'file') {
          const file = items[i].getAsFile();
          if (file) {
            fileFound = true;
            uploadAttachmentMutation.mutate(file);
          }
        }
      }
      
      if (fileFound && !isInput) {
          e.preventDefault();
      }
    };
    
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [isOpen, task?._id]);

  const { data: teamMembers = [] } = useQuery({ queryKey: ['teamMembers'], queryFn: getTeamMembers });
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: getProjects });

  const deleteMutation = useMutation({
    mutationFn: () => deleteTask(task._id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      onClose();
    },
    onError: (err: any) => {
      alert('Failed to delete task: ' + (err?.response?.data?.message || err?.message || 'Unknown error'));
    }
  });

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const uploadAttachmentMutation = useMutation({
    mutationFn: (file: File) => uploadAttachment(task._id, file),
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (err: any) => {
        alert('Failed to upload attachment: ' + (err?.response?.data?.message || err?.message));
    }
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: (index: number) => deleteAttachment(task._id, index),
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (err: any) => {
        alert('Failed to delete attachment: ' + (err?.response?.data?.message || err?.message));
    }
  });

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
    mutationFn: (options?: { force?: boolean }) => {
        if (!task?._id) return Promise.reject(new Error('No task selected'));
        return finishTaskWork(task._id, options?.force);
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

  const updateMutation = useMutation({
    mutationFn: (data: any) => {
        if (!task?._id) return Promise.reject(new Error('No task selected'));
        return updateTask(task._id, data);
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        markTaskActionSuccess('Task Updated', 'Task has been marked for clarification.');
    },
    onError: (error: any) => {
        markTaskActionError('Failed to Update Task', error?.response?.data?.message || 'Failed to update task');
    },
  });

  const approveClientMutation = useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) => {
        return approveTaskClient(id, comment);
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        markTaskActionSuccess('Task Approved', 'Task has been successfully approved by the client.');
    },
    onError: (error: any) => {
        markTaskActionError('Failed to Approve Task', error?.response?.data?.message || 'Failed to approve task');
    },
  });

  const rejectClientMutation = useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) => {
        return rejectTaskClient(id, comment);
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        markTaskActionSuccess('Task Rejected', 'Task has been rejected and sent back for review.');
    },
    onError: (error: any) => {
        markTaskActionError('Failed to Reject Task', error?.response?.data?.message || 'Failed to reject task');
    },
  });

  const approveVerificationMutation = useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) => {
        return approveTaskVerification(id, comment);
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        markTaskActionSuccess('Task Verified', 'Task has been successfully verified.');
    },
    onError: (error: any) => {
        markTaskActionError('Failed to Verify Task', error?.response?.data?.message || 'Failed to verify task');
    },
  });

  const rejectVerificationMutation = useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) => {
        return rejectTaskVerification(id, comment);
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        setIsVerificationRunning(false);
        markTaskActionSuccess('Task Verification Rejected', 'Task has been rejected and sent back for review.');
    },
    onError: (error: any) => {
        markTaskActionError('Failed to Reject Task', error?.response?.data?.message || 'Failed to reject task');
    },
  });

  const startVerificationMutation = useMutation({
    mutationFn: () => {
        if (!task?._id) return Promise.reject(new Error('No task selected'));
        return startTaskVerification(task._id);
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        setIsVerificationRunning(true);
        setIsVerificationPausedState(false);
        markTaskActionSuccess('Verification Started', 'You are now actively verifying this task.');
    },
    onError: (error: any) => {
        markTaskActionError('Failed to Start Verification', error?.response?.data?.message || 'Failed to start verification');
    },
  });

  const pauseVerificationMutation = useMutation({
    mutationFn: () => {
        if (!task?._id) return Promise.reject(new Error('No task selected'));
        return pauseTaskVerification(task._id);
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        setIsVerificationPausedState(true);
        markTaskActionSuccess('Verification Paused', 'Verification time tracking paused.');
    },
    onError: (error: any) => {
        markTaskActionError('Failed to Pause Verification', error?.response?.data?.message || 'Failed to pause verification');
    },
  });

  const resumeVerificationMutation = useMutation({
    mutationFn: () => {
        if (!task?._id) return Promise.reject(new Error('No task selected'));
        return resumeTaskVerification(task._id);
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        setIsVerificationPausedState(false);
        markTaskActionSuccess('Verification Resumed', 'Verification time tracking resumed.');
    },
    onError: (error: any) => {
        markTaskActionError('Failed to Resume Verification', error?.response?.data?.message || 'Failed to resume verification');
    },
  });

  if (!task) return null;

  const assignee = [...teamMembers, ...(isClientOrAssistant && user ? [{ _id: user.id, firstName: user.firstName, lastName: user.lastName }] : [])]
    .find((m: any) => m._id === task.assigneeId?._id || m._id === task.assigneeId);
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
  
  const handleClarificationRequest = () => {
      setIsClarificationModalOpen(true);
      setClarificationText('');
  };

  const submitClarification = () => {
      if (!clarificationText.trim()) return;
      setIsClarificationModalOpen(false);
      openTaskActionRunning('update', 'Requesting Clarification', 'System is marking task for clarification.');
      updateMutation.mutate({ status: 'clarification', needsClarification: true, clarificationText });
  };

  const runFinishFlow = (force?: boolean) => {
      setIsFinishConfirmOpen(false);
      setFinishFlow({
          isOpen: true,
          phase: 'running',
          progressStep: 0,
          error: null,
          hasOpenedResolveUrl: false,
      });
      finishMutation.mutate({ force });
  };

  return (
    <>
      <Drawer isOpen={isOpen} onClose={onClose} title="Task Details" size="2xl">
        <div className="space-y-6">
        {/* Task Title */}
        <div>
          <div className="flex items-start justify-between gap-3 mb-2">
            <h1 className="text-2xl font-bold text-slate-900">{task.title}</h1>
            {isAdmin && (
              <button
                onClick={() => setIsDeleteConfirmOpen(true)}
                disabled={deleteMutation.isPending}
                title="Delete task"
                className="shrink-0 p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
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
                isClientOrAssistant && (task.assigneeId?._id || task.assigneeId) !== user?.id ? (
                  <span className="text-sm font-medium text-slate-700">Development Team</span>
                ) : (
                  <div className="inline-flex items-center gap-2 px-2 py-1 rounded-md hover:bg-slate-200 transition-colors cursor-pointer -ml-2">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-[10px]">
                      {assignee.firstName[0]}{assignee.lastName[0]}
                    </div>
                    <span className="text-sm font-medium text-slate-700">{assignee.firstName} {assignee.lastName}</span>
                  </div>
                )
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
                isClientOrAssistant && (task.verifierId?._id || task.verifierId) !== user?.id ? (
                  <span className="text-sm font-medium text-slate-700">Development Team</span>
                ) : (
                  <div className="inline-flex items-center gap-2 px-2 py-1 rounded-md hover:bg-slate-200 transition-colors cursor-pointer -ml-2">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-[10px]">
                      {verifier.firstName[0]}{verifier.lastName[0]}
                    </div>
                    <span className="text-sm font-medium text-slate-700">{verifier.firstName} {verifier.lastName}</span>
                  </div>
                )
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

          <div className="flex items-center p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <div className="w-1/3 flex items-center gap-2 text-sm text-slate-500">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>Time Tracked</span>
            </div>
            <div className="w-2/3 flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-700">
                  {formatDuration(localSeconds)} <span className="text-slate-400 text-xs font-normal ml-1">(Dev)</span>
                </span>
                {task.activeWorkerId && !isPaused && (
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full animate-pulse">
                    <Play className="w-3 h-3 flex-shrink-0" />
                    Running
                  </span>
                )}
              </div>
              
              {/* Verification Time Tracking Line */}
              {(localVerificationSeconds > 0 || task.verificationStatus !== 'none') && (
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-700">
                    {formatDuration(localVerificationSeconds)} <span className="text-slate-400 text-xs font-normal ml-1">(Verification)</span>
                  </span>
                  {task.activeVerifierId && !isVerificationPausedState && (
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full animate-pulse">
                      <Play className="w-3 h-3 flex-shrink-0" />
                      Running
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* GitHub Branch Row */}
          <div className="flex items-center p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <div className="w-1/3 flex items-center gap-2 text-sm text-slate-500">
              <GitBranch className="w-4 h-4 text-slate-400" />
              <span>GitHub Branch</span>
            </div>
            <div className="w-2/3 flex items-center gap-2">
              {task.githubBranch ? (
                <a 
                  href={project?.githubRepoOwner && project?.githubRepoName ? `https://github.com/${project.githubRepoOwner}/${project.githubRepoName}/tree/${task.githubBranch}` : '#'}
                  target="_blank" rel="noreferrer"
                  className="text-sm font-mono text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded truncate max-w-[200px]"
                  title={task.githubBranch}
                >
                  {task.githubBranch}
                </a>
              ) : (
                <span className="text-sm text-slate-400 italic">No branch created</span>
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

        {/* Attachments Section */}
        <div className="pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-2">
              <Paperclip className="w-4 h-4" />
              Attachments
            </label>
            <div className="relative">
              <input
                type="file"
                multiple
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={(e) => {
                  if (e.target.files?.length) {
                    Array.from(e.target.files).forEach(file => uploadAttachmentMutation.mutate(file));
                  }
                  e.target.value = '';
                }}
              />
              <button className="text-xs flex items-center gap-1 font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2.5 py-1.5 rounded-lg transition-colors">
                <Plus className="w-3.5 h-3.5" />
                Add File
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {task.attachments?.length > 0 ? (
              task.attachments.map((att: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors group">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                      {att.mimeType?.startsWith('image/') ? (
                        <ImageIcon className="w-5 h-5 text-indigo-600" />
                      ) : (
                        <FileIcon className="w-5 h-5 text-indigo-600" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{att.name}</p>
                      <p className="text-xs text-slate-400">
                        {att.size ? (att.size / 1024 / 1024).toFixed(2) + ' MB' : 'Unknown size'} • {new Date(att.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        window.open(`/api/tasks/${task._id}/attachments/${idx}/download`, '_blank');
                      }}
                      className="p-1.5 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    {isAdmin || (currentUser as any)?.id === att.uploadedBy || (currentUser as any)?.userId === att.uploadedBy ? (
                      <button
                        onClick={() => {
                          if (confirm('Delete this attachment?')) {
                            deleteAttachmentMutation.mutate(idx);
                          }
                        }}
                        className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                <Paperclip className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-500">No attachments yet</p>
                <p className="text-xs text-slate-400">Click Add File or press Ctrl+V to paste an image/file</p>
              </div>
            )}
            
            {uploadAttachmentMutation.isPending && (
              <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-indigo-50/50">
                <Loader2 className="w-5 h-5 text-indigo-600 animate-spin flex-shrink-0" />
                <span className="text-sm text-indigo-600 font-medium">Uploading attachment...</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        {task.status !== 'done' && task.status !== 'completed' && task.status !== 'client_approval' && task.verificationStatus !== 'approved' && currentUser?.role !== 'client' && (
          <div className="pt-6 border-t-2 border-slate-200">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3 block">
              Task Actions
            </label>
            
            {task.status === 'under_verification' ? (() => {
              const currentTeamMember = teamMembers.find((m: any) => m._id === currentUser?.id || m._id === (currentUser as any)?.userId);
              const isEligibleVerifier = currentUser?.role === 'admin' || currentUser?.role === 'manager' || currentTeamMember?.canVerifyTasks;
              
              if (isEligibleVerifier) {
                const isActiveVerifierMe = task.activeVerifierId && (task.activeVerifierId._id === currentUser?.id || task.activeVerifierId === currentUser?.id);
                
                return (
                  <div className="flex flex-col gap-3">
                    {!task.activeVerifierId ? (
                      <button
                        onClick={() => {
                          openTaskActionRunning('start', 'Starting Verification', 'System is assigning you as active verifier and starting timer.');
                          startVerificationMutation.mutate();
                        }}
                        disabled={startVerificationMutation.isPending}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold shadow-md hover:shadow-xl transition-all"
                      >
                        <Play className="w-5 h-5 flex-shrink-0" />
                        <span className="truncate">Start Verification Phase</span>
                      </button>
                    ) : isActiveVerifierMe ? (
                      <>
                        <div className="grid grid-cols-2 gap-3 mb-2">
                          <button
                            onClick={() => {
                              if (isVerificationPausedState) {
                                openTaskActionRunning('resume', 'Resuming', 'Resuming verification tracking.');
                                resumeVerificationMutation.mutate();
                              } else {
                                openTaskActionRunning('pause', 'Pausing', 'Pausing verification tracking.');
                                pauseVerificationMutation.mutate();
                              }
                            }}
                            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 font-semibold transition-all ${
                              isVerificationPausedState 
                                ? 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-700' 
                                : 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-700'
                            }`}
                          >
                            {isVerificationPausedState ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                            <span>{isVerificationPausedState ? 'Resume Timer' : 'Pause Timer'}</span>
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => {
                              const comment = prompt("Any comments? (Optional)");
                              if (comment !== null) {
                                  approveVerificationMutation.mutate({ id: task._id, comment: comment || undefined });
                              }
                            }}
                            disabled={approveVerificationMutation.isPending || rejectVerificationMutation.isPending}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold shadow-md hover:shadow-xl transition-all disabled:opacity-50"
                          >
                            <CheckCheck className="w-5 h-5 flex-shrink-0" />
                            <span className="truncate">Verify Task</span>
                          </button>
                          <button
                            onClick={() => {
                              const comment = prompt("Please provide a reason for rejection (Required):");
                              if (comment !== null) {
                                  if (!comment.trim()) {
                                      alert("Rejection reason is required.");
                                      return;
                                  }
                                  rejectVerificationMutation.mutate({ id: task._id, comment });
                              }
                            }}
                            disabled={approveVerificationMutation.isPending || rejectVerificationMutation.isPending}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-rose-50 hover:bg-rose-100 border-2 border-rose-200 hover:border-rose-300 text-rose-700 font-semibold transition-all disabled:opacity-50"
                          >
                            <XCircle className="w-5 h-5 flex-shrink-0" />
                            <span className="truncate">Reject Task</span>
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="bg-violet-50 border-2 border-violet-200 rounded-xl p-4 flex flex-col gap-1 items-center justify-center">
                        <Loader2 className="w-6 h-6 text-violet-600 animate-spin" />
                        <span className="text-sm font-semibold text-violet-800">Another team member is verifying</span>
                      </div>
                    )}
                  </div>
                );
              } else {
                return (
                  <div className="bg-violet-50 border-2 border-violet-200 rounded-xl p-4">
                    <p className="text-sm font-semibold text-violet-800 flex items-center gap-2">
                       <CheckCheck className="w-4 h-4 flex-shrink-0" />
                       Task is under verification
                    </p>
                    <p className="text-xs text-violet-600 mt-1">Waiting for an eligible team member to verify.</p>
                  </div>
                );
              }
            })() : !isTaskRunning ? (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleStartTask}
                  disabled={startMutation.isPending || task.status === 'clarification'}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold shadow-md hover:shadow-xl transition-all disabled:opacity-50"
                  title={task.status === 'clarification' ? 'Task is under clarification' : ''}
                >
                  <Play className="w-5 h-5 flex-shrink-0" />
                  <span className="truncate">Start Working</span>
                </button>
                
                <button
                  onClick={handleClarificationRequest}
                  disabled={task.status === 'clarification' || updateMutation.isPending}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-50 hover:bg-amber-100 border-2 border-amber-200 hover:border-amber-300 text-amber-700 font-semibold transition-all disabled:opacity-50"
                >
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="truncate">Ask Clarification</span>
                </button>
              </div>
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

        {/* Action Buttons (Client Approval) */}
        {task.status === 'client_approval' && (user?.role === 'client' || user?.role === 'client_assistant' || user?.role === 'admin') && (
          <div className="pt-6 border-t-2 border-slate-200">
            <label className="text-xs font-bold text-pink-600 uppercase tracking-wide mb-3 block">
              Client Approval Required
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  const comment = prompt("Any comments? (Optional)");
                  approveClientMutation.mutate({ id: task._id, comment: comment || undefined });
                }}
                disabled={approveClientMutation.isPending || rejectClientMutation.isPending}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-xl shadow-md font-bold transition-all disabled:opacity-50"
              >
                <Check className="w-5 h-5" />
                Approve
              </button>
              <button
                onClick={() => {
                  const comment = prompt("Please provide a reason for rejection:");
                  if (comment !== null) {
                    rejectClientMutation.mutate({ id: task._id, comment });
                  }
                }}
                disabled={approveClientMutation.isPending || rejectClientMutation.isPending}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-rose-50 border-2 border-rose-200 text-rose-700 hover:bg-rose-100 rounded-xl shadow-sm font-bold transition-all disabled:opacity-50"
              >
                <XCircle className="w-5 h-5" />
                Reject
              </button>
            </div>
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
                                            finishMutation.mutate({});
                                        }}
                                        disabled={!finishFlow.hasOpenedResolveUrl || finishMutation.isPending}
                                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        I Resolved Conflict, Retry
                                    </button>
                                    {currentUser?.role === 'admin' && (
                                        <button
                                            onClick={() => {
                                                setFinishFlow((prev) => ({
                                                    ...prev,
                                                    phase: 'running',
                                                    progressStep: 4, // bypass all the way to assigning verifier
                                                    error: null,
                                                }));
                                                finishMutation.mutate({ force: true });
                                            }}
                                            disabled={finishMutation.isPending}
                                            className="px-4 py-2 text-sm bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50 ml-2"
                                            title="Finish immediately without GitHub merge validation"
                                        >
                                            Force Finish
                                        </button>
                                    )}
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

            {isClarificationModalOpen && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100] p-4">
                    <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-xl border border-gray-100">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                                <AlertCircle className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Request Clarification</h3>
                                <p className="text-sm text-gray-500">Provide details on what needs to be clarified</p>
                            </div>
                        </div>
                        <textarea
                            value={clarificationText}
                            onChange={(e) => setClarificationText(e.target.value)}
                            className="w-full h-32 p-3 border-2 border-gray-200 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors resize-none"
                            placeholder="Enter your question or clarification request..."
                            autoFocus
                        />
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => setIsClarificationModalOpen(false)}
                                disabled={updateMutation.isPending}
                                className="px-5 py-2.5 text-sm font-semibold border-2 border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={submitClarification}
                                disabled={updateMutation.isPending || !clarificationText.trim()}
                                className="px-5 py-2.5 text-sm font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 shadow-md transition-all"
                            >
                                {updateMutation.isPending ? 'Submitting...' : 'Submit Request'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Delete Task</h3>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-6">
              Are you sure you want to permanently delete <span className="font-semibold">"{task.title}"</span>? The GitHub branch will also be removed.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsDeleteConfirmOpen(false)}
                disabled={deleteMutation.isPending}
                className="px-5 py-2.5 text-sm font-semibold border-2 border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="px-5 py-2.5 text-sm font-semibold bg-gradient-to-r from-rose-500 to-red-600 text-white rounded-lg hover:from-rose-600 hover:to-red-700 disabled:opacity-50 shadow-md transition-all flex items-center gap-2"
              >
                {deleteMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting...</> : <><Trash2 className="w-4 h-4" /> Delete Task</>}
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
