import React, { useState, useRef, useEffect } from 'react';
import Drawer from './Drawer';
import { Send, Sparkles, CheckCircle2, Calendar, Flag, User, FolderKanban, Bot, Loader2 } from 'lucide-react';
import { useAuth } from '../context/MockAuthContext';
import { mockProjects, mockTeamMembers } from '../data/mockData';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

interface TaskChatbotProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated?: (task: any) => void;
  initialProjectId?: string;
}

export function TaskChatbot({ isOpen, onClose, onTaskCreated, initialProjectId }: TaskChatbotProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [taskDraft, setTaskDraft] = useState<any>({
    projectId: initialProjectId || null,
    title: '',
    description: '',
    priority: 'medium',
    assigneeId: null,
    dueDate: null,
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Initial greeting
      const greeting: Message = {
        id: '1',
        role: 'assistant',
        content: `Hi ${user?.firstName || 'there'}! 👋 I'm your AI task assistant. I'll help you create a new task. What would you like to work on?`,
        timestamp: new Date(),
        suggestions: [
          'Design new landing page',
          'Fix login bug',
          'Write documentation',
          'Team meeting notes'
        ]
      };
      setMessages([greeting]);
    }
  }, [isOpen, user]);

  const addMessage = (role: 'user' | 'assistant', content: string, suggestions?: string[]) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: new Date(),
      suggestions
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const simulateAIResponse = async (userMessage: string) => {
    setIsTyping(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

    const lowerMessage = userMessage.toLowerCase();

    // Parse task details from message
    let response = '';
    let suggestions: string[] | undefined;
    let updatedDraft = { ...taskDraft };

    // Check if title is being set
    if (!taskDraft.title) {
      updatedDraft.title = userMessage;
      response = `Great! I'll create a task called "${userMessage}". `;
      
      // Ask about project if not set
      if (!taskDraft.projectId && mockProjects.length > 0) {
        response += `Which project should this belong to?`;
        suggestions = mockProjects.slice(0, 4).map(p => p.name);
      } else {
        response += `What priority should this task have?`;
        suggestions = ['High priority', 'Medium priority', 'Low priority'];
      }
    }
    // Check for project selection
    else if (!taskDraft.projectId) {
      const project = mockProjects.find(p => 
        p.name.toLowerCase().includes(lowerMessage) || 
        lowerMessage.includes(p.name.toLowerCase())
      );
      
      if (project) {
        updatedDraft.projectId = project._id;
        response = `Perfect! Added to "${project.name}". What's the priority for this task?`;
        suggestions = ['High priority', 'Medium priority', 'Low priority'];
      } else {
        response = `I couldn't find that project. Here are the available projects:`;
        suggestions = mockProjects.slice(0, 4).map(p => p.name);
      }
    }
    // Check for priority
    else if (lowerMessage.includes('high') || lowerMessage.includes('urgent') || lowerMessage.includes('critical')) {
      updatedDraft.priority = 'high';
      response = `Got it! Setting priority to HIGH. Who should be assigned to this task?`;
      suggestions = mockTeamMembers.slice(0, 4).map(m => `${m.firstName} ${m.lastName}`);
      suggestions.push('Assign to me');
    }
    else if (lowerMessage.includes('low')) {
      updatedDraft.priority = 'low';
      response = `Setting priority to LOW. Who should be assigned to this task?`;
      suggestions = mockTeamMembers.slice(0, 4).map(m => `${m.firstName} ${m.lastName}`);
      suggestions.push('Assign to me');
    }
    else if (lowerMessage.includes('medium') || lowerMessage.includes('normal')) {
      updatedDraft.priority = 'medium';
      response = `Setting priority to MEDIUM. Who should be assigned to this task?`;
      suggestions = mockTeamMembers.slice(0, 4).map(m => `${m.firstName} ${m.lastName}`);
      suggestions.push('Assign to me');
    }
    // Check for assignee
    else if (!taskDraft.assigneeId) {
      if (lowerMessage.includes('me') || lowerMessage.includes('myself')) {
        updatedDraft.assigneeId = user?.id;
        response = `Assigned to you! When is this due?`;
        suggestions = ['Today', 'Tomorrow', 'Next week', 'End of month', 'No due date'];
      } else {
        const member = mockTeamMembers.find(m => 
          lowerMessage.includes(m.firstName.toLowerCase()) ||
          lowerMessage.includes(m.lastName.toLowerCase()) ||
          lowerMessage.includes(`${m.firstName} ${m.lastName}`.toLowerCase())
        );
        
        if (member) {
          updatedDraft.assigneeId = member._id;
          response = `Assigned to ${member.firstName} ${member.lastName}! When is this due?`;
          suggestions = ['Today', 'Tomorrow', 'Next week', 'End of month', 'No due date'];
        } else {
          response = `I couldn't find that team member. Please choose from:`;
          suggestions = mockTeamMembers.slice(0, 4).map(m => `${m.firstName} ${m.lastName}`);
          suggestions.push('Assign to me');
        }
      }
    }
    // Check for due date
    else if (!taskDraft.dueDate) {
      let dueDate = null;
      const today = new Date();
      
      if (lowerMessage.includes('today')) {
        dueDate = today.toISOString().split('T')[0];
      } else if (lowerMessage.includes('tomorrow')) {
        dueDate = new Date(today.setDate(today.getDate() + 1)).toISOString().split('T')[0];
      } else if (lowerMessage.includes('next week')) {
        dueDate = new Date(today.setDate(today.getDate() + 7)).toISOString().split('T')[0];
      } else if (lowerMessage.includes('end of month')) {
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        dueDate = lastDay.toISOString().split('T')[0];
      } else if (lowerMessage.includes('no due date') || lowerMessage.includes('skip')) {
        dueDate = null;
      }
      
      updatedDraft.dueDate = dueDate;
      
      if (dueDate) {
        response = `Due date set to ${new Date(dueDate).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric' 
        })}. `;
      } else {
        response = `No due date set. `;
      }
      
      response += `Would you like to add a description? (or say "skip" to create the task now)`;
      suggestions = ['Skip and create task', 'Add description'];
    }
    // Handle description or task creation
    else {
      if (lowerMessage.includes('skip') || lowerMessage.includes('no') || lowerMessage.includes('create')) {
        // Create task
        const project = mockProjects.find(p => p._id === updatedDraft.projectId);
        const assignee = mockTeamMembers.find(m => m._id === updatedDraft.assigneeId) || 
                        (updatedDraft.assigneeId === user?.id ? user : null);
        
        response = `✨ Perfect! I've created your task:\n\n**${updatedDraft.title}**\n`;
        response += `📁 Project: ${project?.name || 'Unknown'}\n`;
        response += `🚩 Priority: ${updatedDraft.priority.toUpperCase()}\n`;
        response += `👤 Assigned to: ${assignee ? `${assignee.firstName} ${assignee.lastName}` : 'Unassigned'}\n`;
        if (updatedDraft.dueDate) {
          response += `📅 Due: ${new Date(updatedDraft.dueDate).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
          })}\n`;
        }
        response += `\nYour task has been created! 🎉`;
        
        suggestions = ['Create another task', 'Close'];
        
        // Call callback if provided
        if (onTaskCreated) {
          onTaskCreated(updatedDraft);
        }
        
        // Reset draft
        setTimeout(() => {
          setTaskDraft({
            projectId: initialProjectId || null,
            title: '',
            description: '',
            priority: 'medium',
            assigneeId: null,
            dueDate: null,
          });
        }, 500);
      } else {
        updatedDraft.description = userMessage;
        
        const project = mockProjects.find(p => p._id === updatedDraft.projectId);
        const assignee = mockTeamMembers.find(m => m._id === updatedDraft.assigneeId) ||
                        (updatedDraft.assigneeId === user?.id ? user : null);
        
        response = `Great description! Here's your task summary:\n\n**${updatedDraft.title}**\n`;
        response += `📁 ${project?.name || 'Unknown'}\n`;
        response += `🚩 ${updatedDraft.priority.toUpperCase()}\n`;
        response += `👤 ${assignee ? `${assignee.firstName} ${assignee.lastName}` : 'Unassigned'}\n`;
        if (updatedDraft.dueDate) {
          response += `📅 ${new Date(updatedDraft.dueDate).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
          })}\n`;
        }
        response += `\nShould I create this task?`;
        suggestions = ['Yes, create it!', 'Let me change something'];
      }
    }

    setTaskDraft(updatedDraft);
    setIsTyping(false);
    addMessage('assistant', response, suggestions);
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    addMessage('user', userMessage);

    // Handle special commands
    if (userMessage.toLowerCase() === 'close') {
      onClose();
      return;
    }

    if (userMessage.toLowerCase().includes('create another')) {
      setTaskDraft({
        projectId: initialProjectId || null,
        title: '',
        description: '',
        priority: 'medium',
        assigneeId: null,
        dueDate: null,
      });
      addMessage('assistant', `Great! Let's create another task. What would you like to work on?`, [
        'Design new landing page',
        'Fix login bug',
        'Write documentation'
      ]);
      return;
    }

    await simulateAIResponse(userMessage);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="AI Task Assistant" size="xl">
      <div className="flex flex-col h-full -m-4">
        {/* Chat Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">AI Task Assistant</h2>
              <p className="text-sm text-indigo-100">Powered by AI • Creating tasks naturally</p>
            </div>
          </div>
          
          {/* Task Draft Preview */}
          {taskDraft.title && (
            <div className="mt-4 p-3 rounded-xl bg-white/10 backdrop-blur border border-white/20">
              <p className="text-xs font-bold text-indigo-100 mb-2">CURRENT DRAFT</p>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="font-semibold">{taskDraft.title}</span>
                </div>
                {taskDraft.projectId && (
                  <div className="flex items-center gap-2 text-indigo-100">
                    <FolderKanban className="w-3 h-3" />
                    <span className="text-xs">
                      {mockProjects.find(p => p._id === taskDraft.projectId)?.name}
                    </span>
                  </div>
                )}
                {taskDraft.priority && (
                  <div className="flex items-center gap-2 text-indigo-100">
                    <Flag className="w-3 h-3" />
                    <span className="text-xs capitalize">{taskDraft.priority} priority</span>
                  </div>
                )}
                {taskDraft.assigneeId && (
                  <div className="flex items-center gap-2 text-indigo-100">
                    <User className="w-3 h-3" />
                    <span className="text-xs">
                      {mockTeamMembers.find(m => m._id === taskDraft.assigneeId)?.firstName || user?.firstName}
                    </span>
                  </div>
                )}
                {taskDraft.dueDate && (
                  <div className="flex items-center gap-2 text-indigo-100">
                    <Calendar className="w-3 h-3" />
                    <span className="text-xs">
                      {new Date(taskDraft.dueDate).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
          {messages.map((message) => (
            <div key={message.id}>
              <div
                className={`flex gap-3 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white border-2 border-slate-200 text-slate-900'
                  }`}
                >
                  <p className="text-sm whitespace-pre-line">{message.content}</p>
                  <p className={`text-xs mt-1 ${
                    message.role === 'user' ? 'text-indigo-100' : 'text-slate-400'
                  }`}>
                    {message.timestamp.toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </p>
                </div>

                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </div>
                )}
              </div>

              {/* Suggestions */}
              {message.role === 'assistant' && message.suggestions && (
                <div className="flex flex-wrap gap-2 mt-3 ml-11">
                  {message.suggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
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

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-white border-2 border-slate-200 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-1">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                  <span className="text-sm text-slate-600">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t-2 border-slate-200 bg-white p-4">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  className="w-full px-4 py-3 pr-12 rounded-xl border-2 border-slate-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none transition-all text-sm"
                  disabled={isTyping}
                />
              </div>
            </div>
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="h-12 w-12 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white flex items-center justify-center shadow-lg hover:shadow-xl transition-all"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2 text-center">
            Press Enter to send • AI will guide you through task creation
          </p>
        </div>
      </div>
    </Drawer>
  );
}
