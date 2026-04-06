import React, { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Drawer from './Drawer';
import {
  Send, Sparkles, CheckCircle2, Calendar, Flag, User,
  FolderKanban, Bot, Loader2, AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { getProjects } from '../../services/core';
import { getTeamMembers } from '../../services/team';
import { createTask } from '../../services/task';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
  isError?: boolean;
}

interface TaskChatbotProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated?: (task: any) => void;
  initialProjectId?: string;
}

const EMPTY_DRAFT = (projectId?: string) => ({
  projectId: projectId || null,
  title: '',
  description: '',
  priority: 'medium',
  assigneeId: null,
  dueDate: null,
  aiPrompt: '',
});

export function TaskChatbot({ isOpen, onClose, onTaskCreated, initialProjectId }: TaskChatbotProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: getProjects });
  const { data: teamMembers = [] } = useQuery({ queryKey: ['teamMembers'], queryFn: getTeamMembers });

  const [messages, setMessages] = useState<Message[]>([]);
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [taskDraft, setTaskDraft] = useState<any>(EMPTY_DRAFT());
  const [taskCreated, setTaskCreated] = useState(false);

  const selectedProjectId = taskDraft.projectId || '';
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  const addMessage = (
    role: 'user' | 'assistant',
    content: string,
    suggestions?: string[],
    isError?: boolean
  ) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        role,
        content,
        timestamp: new Date(),
        suggestions,
        isError,
      },
    ]);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      addMessage(
        'assistant',
        `Hi ${user?.firstName || 'there'}! Please select a project first, then describe the task you want to create and I'll plan the full implementation for you.`
      );
    }
  }, [isOpen, messages.length, user?.firstName]);

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setMessages([]);
        setChatHistory([]);
        setTaskDraft(EMPTY_DRAFT());
        setTaskCreated(false);
        setInput('');
      }, 300);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !initialProjectId || selectedProjectId) return;
    const initialProject = projects.find((project: any) => project._id === initialProjectId);
    if (!initialProject) return;

    setTaskDraft(EMPTY_DRAFT(initialProjectId));
    addMessage(
      'assistant',
      `Project selected: ${initialProject.name}. Now tell me what task you want to create.`,
      ['Add user authentication', 'Fix a bug', 'Build a new feature', 'Refactor existing code']
    );
  }, [initialProjectId, isOpen, projects, selectedProjectId]);

  const createTaskMutation = useMutation({
    mutationFn: (data: any) => createTask(data),
    onSuccess: (createdTask) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', taskDraft.projectId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setTaskCreated(true);
      addMessage(
        'assistant',
        `Task created! "${taskDraft.title}" is now in your project with the full implementation plan attached. You can find it in the tasks list.`,
        ['Create another task', 'Close']
      );
      onTaskCreated?.(createdTask);
    },
    onError: (err: any) => {
      addMessage(
        'assistant',
        `Failed to create task: ${err?.response?.data?.message || 'Something went wrong. Please try again.'}`,
        ['Try again'],
        true
      );
    },
  });

  const callAI = async (userMessage: string) => {
    if (!selectedProjectId) return;
    setIsTyping(true);

    const newHistory = [
      ...chatHistory,
      { role: 'user' as const, content: userMessage },
    ];

    const assistantMessageId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setMessages((prev) => [
      ...prev,
      {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      },
    ]);

    try {
      const token = localStorage.getItem('token');
      // Resolve base URL from API client config or env
      const baseUrl = import.meta.env.VITE_API_URL || '/api';
      
      const res = await fetch(`${baseUrl}/ai/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          messages: newHistory,
          taskDraft,
          projectId: selectedProjectId,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to connect to AI server');
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      if (!reader) throw new Error('No reader available');

      let accumulatedReply = '';
      let isDone = false;
      let streamedBuffer = '';

      while (!isDone) {
        const { value, done } = await reader.read();
        if (done) {
          isDone = true;
          break;
        }

        streamedBuffer += decoder.decode(value, { stream: true });
        const lines = streamedBuffer.split('\n');
        
        // Keep the last partial line in the buffer
        streamedBuffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim().startsWith('data:')) {
            const dataStr = line.substring(line.indexOf('data:') + 5).trim();
            if (!dataStr) continue;

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.type === 'error') {
                throw new Error(parsed.error);
              } else if (parsed.type === 'delta') {
                accumulatedReply += parsed.text;
                // Live update the message content
                setMessages((prev) => prev.map(m => m.id === assistantMessageId ? { ...m, content: accumulatedReply } : m));
              } else if (parsed.type === 'done') {
                const { reply, taskDraft: updatedDraft, action, suggestions } = parsed.parsed;
                
                setChatHistory([...newHistory, { role: 'assistant', content: reply }]);

                const merged = { ...taskDraft };
                if (updatedDraft) {
                  Object.entries(updatedDraft).forEach(([key, value]) => {
                    if (value !== null && value !== '' && value !== undefined) merged[key] = value;
                  });
                }
                merged.projectId = merged.projectId || selectedProjectId;
                setTaskDraft(merged);

                setMessages((prev) => prev.map(m => m.id === assistantMessageId ? { ...m, content: reply, suggestions } : m));

                if (action && action.toLowerCase().includes('create')) {
                  const payload: any = {
                    title: merged.title || 'AI Task',
                    projectId: merged.projectId || selectedProjectId,
                    priority: merged.priority || 'medium',
                    status: 'todo',
                    description: merged.description || '',
                    aiPrompt: merged.aiPrompt || userMessage,
                  };
                  if (merged.assigneeId) payload.assigneeId = merged.assigneeId;
                  if (merged.dueDate) payload.dueDate = merged.dueDate;

                  createTaskMutation.mutate(payload);
                }
              }
            } catch (e) {
              // Ignore split JSON errors from partial data lines if any occur across chunks
            }
          }
        }
      }

    } catch (err: any) {
      setMessages((prev) => prev.map(m => m.id === assistantMessageId ? { 
          ...m, 
          content: `Sorry, I couldn't reach the AI service. ${err?.message || 'Please try again.'}`,
          isError: true 
      } : m));
    } finally {
      setIsTyping(false);
    }
  };

  const handleProjectChange = (projectId: string) => {
    const project = projects.find((item: any) => item._id === projectId);
    const hadConversation = chatHistory.length > 0 || taskDraft.title || taskDraft.description;

    setTaskDraft(EMPTY_DRAFT(projectId || undefined));
    setTaskCreated(false);
    setInput('');

    if (hadConversation) {
      setMessages([]);
      setChatHistory([]);
    }

    if (!projectId || !project) return;

    addMessage(
      'assistant',
      `Project selected: ${project.name}. Now tell me what task you want to create.`,
      ['Add user authentication', 'Fix a bug', 'Build a new feature', 'Refactor existing code']
    );
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSend = async () => {
    const userMessage = input.trim();
    if (!userMessage || isTyping || !selectedProjectId) return;

    setInput('');
    addMessage('user', userMessage);

    if (taskCreated) {
      if (userMessage.toLowerCase().includes('another')) {
        setMessages([]);
        setChatHistory([]);
        setTaskDraft(EMPTY_DRAFT());
        setTaskCreated(false);
        addMessage('assistant', 'Let\'s create another task. Please select a project first.');
        return;
      }
      if (userMessage.toLowerCase() === 'close') {
        onClose();
        return;
      }
    }

    await callAI(userMessage);
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (suggestion.toLowerCase() === 'close') {
      onClose();
      return;
    }
    if (!selectedProjectId) return;
    setInput(suggestion);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const assignee = teamMembers.find((member: any) => member._id === taskDraft.assigneeId);
  const project = projects.find((item: any) => item._id === selectedProjectId);

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="AI Task Planner" size="xl">
      <div className="flex flex-col h-full -m-4">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">AI Task Planner</h2>
              <p className="text-sm text-indigo-100">Select a project first, then describe your task</p>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-[10px] font-bold text-indigo-200 uppercase tracking-widest mb-1.5">
              Project
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => handleProjectChange(e.target.value)}
              disabled={isTyping || createTaskMutation.isPending || projects.length === 0}
              className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white backdrop-blur outline-none disabled:opacity-60"
            >
              <option value="" className="text-slate-900">Select a project</option>
              {projects.map((projectOption: any) => (
                <option key={projectOption._id} value={projectOption._id} className="text-slate-900">
                  {projectOption.name}
                </option>
              ))}
            </select>
          </div>

          {taskDraft.title && (
            <div className="mt-4 p-3 rounded-xl bg-white/10 backdrop-blur border border-white/20 space-y-1">
              <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest mb-1.5">Draft</p>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {taskDraft.title}
              </div>
              {project && (
                <div className="flex items-center gap-2 text-xs text-indigo-100">
                  <FolderKanban className="w-3 h-3" />
                  {project.name}
                </div>
              )}
              {taskDraft.priority && (
                <div className="flex items-center gap-2 text-xs text-indigo-100">
                  <Flag className="w-3 h-3" />
                  <span className="capitalize">{taskDraft.priority} priority</span>
                </div>
              )}
              {assignee && (
                <div className="flex items-center gap-2 text-xs text-indigo-100">
                  <User className="w-3 h-3" />
                  {assignee.firstName} {assignee.lastName}
                </div>
              )}
              {taskDraft.dueDate && (
                <div className="flex items-center gap-2 text-xs text-indigo-100">
                  <Calendar className="w-3 h-3" />
                  {new Date(taskDraft.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              )}
              {taskDraft.description && (
                <div className="mt-2 text-[10px] text-indigo-200 bg-white/10 rounded-lg px-2 py-1.5 border border-white/10">
                  Implementation plan generated
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
          {messages.map((msg) => (
            <div key={msg.id}>
              <div className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0 ${msg.isError ? 'bg-rose-500' : 'bg-gradient-to-br from-indigo-500 to-purple-600'}`}>
                    {msg.isError ? <AlertCircle className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : msg.isError
                      ? 'bg-rose-50 border-2 border-rose-200 text-rose-800'
                      : 'bg-white border-2 border-slate-200 text-slate-900'
                }`}>
                  <p className="text-sm whitespace-pre-line">{msg.content}</p>
                  <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-indigo-100' : 'text-slate-400'}`}>
                    {msg.timestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </p>
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </div>
                )}
              </div>

              {msg.role === 'assistant' && msg.suggestions && (
                <div className="flex flex-wrap gap-2 mt-3 ml-11">
                  {msg.suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="px-3 py-1.5 rounded-full bg-white border-2 border-indigo-200 text-indigo-700 text-xs font-semibold hover:bg-indigo-50 hover:border-indigo-300 transition-all"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {(isTyping || createTaskMutation.isPending) && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-white border-2 border-slate-200 rounded-2xl px-4 py-3 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                <span className="text-sm text-slate-600">
                  {createTaskMutation.isPending ? 'Creating task...' : 'Planning...'}
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="border-t-2 border-slate-200 bg-white p-4">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={selectedProjectId ? "Describe a task, e.g. 'Add JWT auth to the API'" : 'Select a project to start'}
                disabled={isTyping || createTaskMutation.isPending || !selectedProjectId}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none transition-all text-sm disabled:opacity-50"
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping || createTaskMutation.isPending || !selectedProjectId}
              className="h-12 w-12 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white flex items-center justify-center shadow-lg hover:shadow-xl transition-all"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2 text-center">
            {selectedProjectId
              ? 'AI will plan the implementation and create the task for you'
              : 'Select a project before starting the AI task planner'}
          </p>
        </div>
      </div>
    </Drawer>
  );
}
