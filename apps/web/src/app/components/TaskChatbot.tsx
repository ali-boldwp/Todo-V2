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
import api from '../../services/api';

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
  // Store messages in AI format for the backend conversation history
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [taskDraft, setTaskDraft] = useState<any>(EMPTY_DRAFT(initialProjectId));
  const [taskCreated, setTaskCreated] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => { scrollToBottom(); }, [messages]);

  // Greet on open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      addMessage('assistant', `Hi ${user?.firstName || 'there'}! 👋 Describe the task you want to create and I'll plan the full implementation for you.`, [
        'Add user authentication',
        'Fix a bug',
        'Build a new feature',
        'Refactor existing code',
      ]);
    }
  }, [isOpen]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setMessages([]);
        setChatHistory([]);
        setTaskDraft(EMPTY_DRAFT(initialProjectId));
        setTaskCreated(false);
        setInput('');
      }, 300);
    }
  }, [isOpen]);

  const createTaskMutation = useMutation({
    mutationFn: (data: any) => createTask(data),
    onSuccess: (createdTask) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', taskDraft.projectId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setTaskCreated(true);
      addMessage('assistant',
        `✅ Task created! **"${taskDraft.title}"** is now in your project with the full implementation plan attached. You can find it in the tasks list.`,
        ['Create another task', 'Close']
      );
      onTaskCreated?.(createdTask);
    },
    onError: (err: any) => {
      addMessage('assistant',
        `❌ Failed to create task: ${err?.response?.data?.message || 'Something went wrong. Please try again.'}`,
        ['Try again'],
        true
      );
    },
  });

  const addMessage = (
    role: 'user' | 'assistant',
    content: string,
    suggestions?: string[],
    isError?: boolean
  ) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role,
      content,
      timestamp: new Date(),
      suggestions,
      isError,
    }]);
  };

  const callAI = async (userMessage: string) => {
    setIsTyping(true);

    const newHistory = [
      ...chatHistory,
      { role: 'user' as const, content: userMessage },
    ];

    try {
      const { data } = await api.post('/ai/chat', {
        messages: newHistory,
        taskDraft,
        projectId: initialProjectId,
      });

      const { reply, taskDraft: updatedDraft, action, suggestions } = data;

      // Update history with assistant reply
      setChatHistory([...newHistory, { role: 'assistant', content: reply }]);

      // Merge draft (keep non-null/non-empty values)
      const merged = { ...taskDraft };
      if (updatedDraft) {
        Object.entries(updatedDraft).forEach(([k, v]) => {
          if (v !== null && v !== '' && v !== undefined) merged[k] = v;
        });
      }
      setTaskDraft(merged);

      addMessage('assistant', reply, suggestions);

      // If AI says create, actually save the task
      if (action === 'create') {
        const payload: any = {
          title: merged.title,
          projectId: merged.projectId || initialProjectId,
          priority: merged.priority || 'medium',
          status: 'todo',
          description: merged.description || '',
          aiPrompt: merged.aiPrompt || userMessage,
        };
        if (merged.assigneeId) payload.assigneeId = merged.assigneeId;
        if (merged.dueDate) payload.dueDate = merged.dueDate;

        createTaskMutation.mutate(payload);
      }
    } catch (err: any) {
      addMessage('assistant',
        `Sorry, I couldn't reach the AI service. ${err?.response?.data?.message || 'Please check your connection and try again.'}`,
        undefined,
        true
      );
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = async () => {
    const userMessage = input.trim();
    if (!userMessage || isTyping) return;

    setInput('');
    addMessage('user', userMessage);

    // Handle post-creation commands
    if (taskCreated) {
      if (userMessage.toLowerCase().includes('another')) {
        setMessages([]);
        setChatHistory([]);
        setTaskDraft(EMPTY_DRAFT(initialProjectId));
        setTaskCreated(false);
        addMessage('assistant', `Let's create another task! What would you like to build?`, [
          'New feature', 'Bug fix', 'Refactor', 'Documentation',
        ]);
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
    if (suggestion.toLowerCase() === 'close') { onClose(); return; }
    setInput(suggestion);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const assignee = teamMembers.find((m: any) => m._id === taskDraft.assigneeId);
  const project = projects.find((p: any) => p._id === (taskDraft.projectId || initialProjectId));

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="AI Task Planner" size="xl">
      <div className="flex flex-col h-full -m-4">

        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">AI Task Planner</h2>
              <p className="text-sm text-indigo-100">Describe your task → get a full implementation plan</p>
            </div>
          </div>

          {/* Live draft preview */}
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
                  📋 Implementation plan generated
                </div>
              )}
            </div>
          )}
        </div>

        {/* Messages */}
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

              {/* Suggestions */}
              {msg.role === 'assistant' && msg.suggestions && (
                <div className="flex flex-wrap gap-2 mt-3 ml-11">
                  {msg.suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestionClick(s)}
                      className="px-3 py-1.5 rounded-full bg-white border-2 border-indigo-200 text-indigo-700 text-xs font-semibold hover:bg-indigo-50 hover:border-indigo-300 transition-all"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
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

        {/* Input */}
        <div className="border-t-2 border-slate-200 bg-white p-4">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe a task, e.g. 'Add JWT auth to the API'"
                disabled={isTyping || createTaskMutation.isPending}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none transition-all text-sm disabled:opacity-50"
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping || createTaskMutation.isPending}
              className="h-12 w-12 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white flex items-center justify-center shadow-lg hover:shadow-xl transition-all"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2 text-center">
            AI will plan the implementation and create the task for you
          </p>
        </div>
      </div>
    </Drawer>
  );
}
