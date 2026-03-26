import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Loader2,
  CheckCircle2,
  Code,
  FileCode,
  Terminal,
  Sparkles,
  Zap,
  AlertCircle,
  User,
} from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'codex' | 'system';
  content: string;
  timestamp: Date;
  status?: 'thinking' | 'executing' | 'completed' | 'error';
  actions?: {
    type: 'file_created' | 'code_generated' | 'test_passed' | 'deployed';
    details: string;
  }[];
}

interface CodexTaskChatProps {
  taskId: string;
  taskTitle: string;
  taskPrompt?: string;
  onTaskComplete?: () => void;
}

export function CodexTaskChat({ taskId, taskTitle, taskPrompt }: CodexTaskChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'system',
      content: '🤖 CODEX AI Agent activated. I\'ll help you complete this task. Tell me what you\'d like to do, and I\'ll execute it for you.',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Auto-start if task has AI prompt
    if (taskPrompt && messages.length === 1) {
      setTimeout(() => {
        handleCodexInitialResponse();
      }, 1000);
    }
  }, [taskPrompt]);

  const handleCodexInitialResponse = () => {
    const codexMessage: Message = {
      id: Date.now().toString(),
      type: 'codex',
      content: `I see this task was created from the prompt: "${taskPrompt}"\n\nI'm analyzing the requirements and preparing to execute this task for you. Would you like me to proceed with the implementation?`,
      timestamp: new Date(),
      status: 'completed',
    };

    setMessages((prev) => [...prev, codexMessage]);
  };

  const simulateCodexExecution = async (userInput: string) => {
    // Thinking phase
    const thinkingMessage: Message = {
      id: Date.now().toString(),
      type: 'codex',
      content: 'Analyzing your request...',
      timestamp: new Date(),
      status: 'thinking',
    };

    setMessages((prev) => [...prev, thinkingMessage]);

    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Update to executing
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === thinkingMessage.id
          ? { ...msg, status: 'executing', content: 'Executing task...' }
          : msg
      )
    );

    console.log('🤖 CODEX: Processing user request', {
      taskId,
      taskTitle,
      userInput,
      timestamp: new Date().toISOString(),
    });

    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Generate response based on input
    const response = generateCodexResponse(userInput);

    setMessages((prev) =>
      prev.filter((msg) => msg.id !== thinkingMessage.id).concat(response)
    );

    console.log('✅ CODEX: Task execution completed', {
      taskId,
      actions: response.actions?.length || 0,
      timestamp: new Date().toISOString(),
    });

    console.log('📡 MESSAGE COMMAND CENTER: CODEX completed task actions', {
      event: 'CODEX_EXECUTION_COMPLETE',
      taskId,
      taskTitle,
      filesCreated: response.actions?.filter((a) => a.type === 'file_created').length || 0,
      timestamp: new Date().toISOString(),
    });
  };

  const generateCodexResponse = (userInput: string): Message => {
    const input = userInput.toLowerCase();

    // Different responses based on keywords
    if (input.includes('implement') || input.includes('create') || input.includes('build')) {
      return {
        id: Date.now().toString(),
        type: 'codex',
        content: `Perfect! I've completed the implementation for you. Here's what I did:`,
        timestamp: new Date(),
        status: 'completed',
        actions: [
          {
            type: 'file_created',
            details: 'Created authentication.service.ts with login/register logic',
          },
          {
            type: 'file_created',
            details: 'Created auth.controller.ts with API endpoints',
          },
          {
            type: 'code_generated',
            details: 'Generated JWT token validation middleware',
          },
          {
            type: 'file_created',
            details: 'Created password reset email templates',
          },
          {
            type: 'test_passed',
            details: 'All authentication unit tests passing (18/18)',
          },
          {
            type: 'code_generated',
            details: 'Added rate limiting to prevent brute force attacks',
          },
        ],
      };
    } else if (input.includes('test') || input.includes('verify')) {
      return {
        id: Date.now().toString(),
        type: 'codex',
        content: `I've run comprehensive tests on the implementation:`,
        timestamp: new Date(),
        status: 'completed',
        actions: [
          {
            type: 'test_passed',
            details: 'Unit tests: 24/24 passed ✓',
          },
          {
            type: 'test_passed',
            details: 'Integration tests: 12/12 passed ✓',
          },
          {
            type: 'test_passed',
            details: 'Security audit: No vulnerabilities found ✓',
          },
          {
            type: 'test_passed',
            details: 'Performance benchmarks: Within acceptable limits ✓',
          },
        ],
      };
    } else if (input.includes('deploy') || input.includes('publish')) {
      return {
        id: Date.now().toString(),
        type: 'codex',
        content: `Deployment completed successfully!`,
        timestamp: new Date(),
        status: 'completed',
        actions: [
          {
            type: 'deployed',
            details: 'Code pushed to GitHub repository',
          },
          {
            type: 'deployed',
            details: 'CI/CD pipeline triggered',
          },
          {
            type: 'deployed',
            details: 'Deployed to staging environment',
          },
          {
            type: 'test_passed',
            details: 'Smoke tests passed on staging',
          },
        ],
      };
    } else if (input.includes('fix') || input.includes('bug') || input.includes('issue')) {
      return {
        id: Date.now().toString(),
        type: 'codex',
        content: `I've identified and fixed the issues:`,
        timestamp: new Date(),
        status: 'completed',
        actions: [
          {
            type: 'code_generated',
            details: 'Fixed null pointer exception in email validation',
          },
          {
            type: 'code_generated',
            details: 'Corrected password regex pattern',
          },
          {
            type: 'test_passed',
            details: 'All edge cases now handled properly',
          },
          {
            type: 'file_created',
            details: 'Added error logging for debugging',
          },
        ],
      };
    } else if (input.includes('document') || input.includes('readme')) {
      return {
        id: Date.now().toString(),
        type: 'codex',
        content: `Documentation generated and updated:`,
        timestamp: new Date(),
        status: 'completed',
        actions: [
          {
            type: 'file_created',
            details: 'Created comprehensive README.md',
          },
          {
            type: 'file_created',
            details: 'Generated API documentation with examples',
          },
          {
            type: 'code_generated',
            details: 'Added inline code comments',
          },
          {
            type: 'file_created',
            details: 'Created setup instructions for new developers',
          },
        ],
      };
    } else if (input.includes('yes') || input.includes('proceed') || input.includes('go ahead')) {
      return {
        id: Date.now().toString(),
        type: 'codex',
        content: `Excellent! I've started working on the task. Here's my progress:`,
        timestamp: new Date(),
        status: 'completed',
        actions: [
          {
            type: 'file_created',
            details: 'Created project structure and boilerplate',
          },
          {
            type: 'code_generated',
            details: 'Generated core authentication logic',
          },
          {
            type: 'file_created',
            details: 'Set up database models and migrations',
          },
          {
            type: 'code_generated',
            details: 'Implemented security middleware',
          },
          {
            type: 'test_passed',
            details: 'Initial tests created and passing',
          },
        ],
      };
    } else {
      return {
        id: Date.now().toString(),
        type: 'codex',
        content: `I understand you want to: "${userInput}"\n\nI've processed your request and completed the necessary changes. The code has been generated and is ready for review. Would you like me to run tests or deploy this?`,
        timestamp: new Date(),
        status: 'completed',
        actions: [
          {
            type: 'code_generated',
            details: 'Generated implementation based on your requirements',
          },
          {
            type: 'test_passed',
            details: 'Basic validation completed',
          },
        ],
      };
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);

    console.log('💬 CODEX: User message sent', {
      taskId,
      message: input.trim(),
      timestamp: new Date().toISOString(),
    });

    await simulateCodexExecution(input.trim());

    setIsProcessing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'file_created':
        return <FileCode className="w-4 h-4 text-emerald-600" />;
      case 'code_generated':
        return <Code className="w-4 h-4 text-blue-600" />;
      case 'test_passed':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'deployed':
        return <Zap className="w-4 h-4 text-purple-600" />;
      default:
        return <Terminal className="w-4 h-4 text-slate-600" />;
    }
  };

  const getActionColor = (type: string) => {
    switch (type) {
      case 'file_created':
        return 'bg-emerald-50 border-emerald-200 text-emerald-800';
      case 'code_generated':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'test_passed':
        return 'bg-emerald-50 border-emerald-200 text-emerald-800';
      case 'deployed':
        return 'bg-purple-50 border-purple-200 text-purple-800';
      default:
        return 'bg-slate-50 border-slate-200 text-slate-800';
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-gradient-to-br from-slate-50 to-indigo-50 rounded-2xl border-2 border-indigo-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <div className="shrink-0">
            <h3 className="font-bold">CODEX AI Agent</h3>
            <p className="text-xs text-indigo-100">Executing task on your behalf</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 mx-auto">
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
              <path d="M11.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122V6A2.5 2.5 0 0110 8.5H6a1 1 0 00-1 1v1.128a2.251 2.251 0 11-1.5 0V5.372a2.25 2.25 0 111.5 0v1.836A2.492 2.492 0 016 7h4a1 1 0 001-1v-.628A2.25 2.25 0 019.5 3.25zM4.25 12a.75.75 0 100 1.5.75.75 0 000-1.5zM3.5 3.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0z"/>
            </svg>
            <p className="text-xs font-mono font-semibold">feature/task-{taskId}</p>
          </div>
          <div className="shrink-0">
            <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-bold flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Active
            </span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.type !== 'user' && (
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  message.type === 'system'
                    ? 'bg-slate-200'
                    : 'bg-gradient-to-br from-indigo-600 to-purple-600'
                }`}
              >
                {message.type === 'system' ? (
                  <AlertCircle className="w-4 h-4 text-slate-600" />
                ) : (
                  <Bot className="w-4 h-4 text-white" />
                )}
              </div>
            )}

            <div
              className={`max-w-[80%] ${
                message.type === 'user'
                  ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-sm'
                  : message.type === 'system'
                  ? 'bg-slate-200 text-slate-700 rounded-2xl'
                  : 'bg-white rounded-2xl rounded-tl-sm border-2 border-indigo-100'
              } p-4 shadow-sm`}
            >
              {/* Status indicator */}
              {message.status && message.type === 'codex' && (
                <div className="flex items-center gap-2 mb-2 text-xs">
                  {message.status === 'thinking' && (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
                      <span className="text-indigo-600 font-semibold">Thinking...</span>
                    </>
                  )}
                  {message.status === 'executing' && (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                      <span className="text-blue-600 font-semibold">Executing...</span>
                    </>
                  )}
                  {message.status === 'completed' && (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-600 font-semibold">Completed</span>
                    </>
                  )}
                </div>
              )}

              <p className={`text-sm whitespace-pre-wrap ${message.type === 'user' ? '' : 'text-slate-700'}`}>
                {message.content}
              </p>

              {/* Actions */}
              {message.actions && message.actions.length > 0 && (
                <div className="mt-3 space-y-2">
                  {message.actions.map((action, index) => (
                    <div
                      key={index}
                      className={`flex items-start gap-2 p-2 rounded-lg border ${getActionColor(
                        action.type
                      )}`}
                    >
                      {getActionIcon(action.type)}
                      <span className="text-xs font-medium flex-1">{action.details}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Timestamp */}
              <p
                className={`text-[10px] mt-2 ${
                  message.type === 'user' ? 'text-indigo-200' : 'text-slate-400'
                }`}
              >
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            {message.type === 'user' && (
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
        ))}

        {isProcessing && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white rounded-2xl rounded-tl-sm border-2 border-indigo-100 p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce"></div>
                  <div className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce delay-100"></div>
                  <div className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce delay-200"></div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t-2 border-indigo-200">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Tell CODEX what to do... (e.g., 'implement the login function')"
            disabled={isProcessing}
            className="flex-1 px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isProcessing}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center gap-2"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        <p className="text-[10px] text-slate-400 mt-2">
          CODEX will execute your requests and complete the task for you
        </p>
      </div>
    </div>
  );
}