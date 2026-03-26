import React, { useState } from 'react';
import { useAuth } from '../context/MockAuthContext';
import { mockProjects, mockTasks, mockTeamMembers, mockClients } from '../data/mockData';
import {
  FolderKanban,
  CheckCircle,
  Clock,
  AlertCircle,
  Users,
  TrendingUp,
  Calendar,
  Zap,
  Sparkles,
} from 'lucide-react';
import { TaskPreviewDrawer } from '../components/TaskPreviewDrawer';
import { TaskChatbot } from '../components/TaskChatbot';

export function DashboardPage() {
  const { user } = useAuth();
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);

  const isAdmin = user?.role === 'admin';

  // Calculate stats
  const totalProjects = mockProjects.length;
  const activeProjects = mockProjects.filter((p: any) => p.status === 'active').length;
  const completedProjects = mockProjects.filter((p: any) => p.status === 'completed').length;

  const totalTasks = mockTasks.length;
  const taskTodo = mockTasks.filter((t: any) => t.status === 'todo').length;
  const taskInProgress = mockTasks.filter((t: any) => t.status === 'in_progress').length;
  const taskUnderVerification = mockTasks.filter((t: any) => t.status === 'under_verification').length;
  const taskDone = mockTasks.filter((t: any) => t.status === 'done').length;
  const completionRate = totalTasks > 0 ? Math.round((taskDone / totalTasks) * 100) : 0;

  const clarificationRequiredTasks = mockTasks.filter(
    (task: any) => task.status === 'clarification' || task.needsClarification === true
  );

  const activeTeamMembers = mockTeamMembers.filter((m: any) => m.isActive).length;
  const totalClients = mockClients.length;

  return (
    <div className="min-h-full p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white shadow-xl">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                Welcome back, {user?.firstName || 'User'}! 👋
              </h1>
              <p className="text-indigo-100 text-lg">
                {isAdmin ? 'Admin Dashboard Overview' : 'Your workspace at a glance'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-indigo-100 text-sm">Today</p>
              <p className="text-xl font-semibold">{new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'short', 
                day: 'numeric' 
              })}</p>
            </div>
          </div>
        </div>

        {/* Clarification Tasks Alert */}
        {clarificationRequiredTasks.length > 0 && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center shrink-0">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-amber-900 mb-1">
                  Clarification Required
                </h2>
                <p className="text-sm text-amber-700 mb-4">
                  {clarificationRequiredTasks.length} {clarificationRequiredTasks.length === 1 ? 'task needs' : 'tasks need'} your attention
                </p>
                <div className="flex flex-wrap gap-2">
                  {clarificationRequiredTasks.slice(0, 3).map((task: any) => (
                    <button
                      key={task._id}
                      onClick={() => {
                        setSelectedTask(task);
                        setIsDrawerOpen(true);
                      }}
                      className="bg-white rounded-lg px-4 py-2 border border-amber-200 text-sm text-amber-900 font-medium hover:bg-amber-50 transition-colors cursor-pointer"
                    >
                      {task.title}
                    </button>
                  ))}
                  {clarificationRequiredTasks.length > 3 && (
                    <div className="bg-white rounded-lg px-4 py-2 border border-amber-200 text-sm text-amber-600 font-medium">
                      +{clarificationRequiredTasks.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Projects */}
          <div className="bg-white rounded-2xl p-6 border-2 border-slate-200 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <FolderKanban className="w-6 h-6 text-blue-600" />
              </div>
              <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">
                {activeProjects} Active
              </span>
            </div>
            <p className="text-sm text-slate-500 font-semibold uppercase tracking-wide mb-1">
              Total Projects
            </p>
            <p className="text-3xl font-bold text-slate-900">{totalProjects}</p>
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
              <CheckCircle className="w-3 h-3" />
              <span>{completedProjects} completed</span>
            </div>
          </div>

          {/* Tasks */}
          <div className="bg-white rounded-2xl p-6 border-2 border-slate-200 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-indigo-600" />
              </div>
              <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold">
                {completionRate}%
              </span>
            </div>
            <p className="text-sm text-slate-500 font-semibold uppercase tracking-wide mb-1">
              Total Tasks
            </p>
            <p className="text-3xl font-bold text-slate-900">{totalTasks}</p>
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
              <TrendingUp className="w-3 h-3" />
              <span>{taskDone} completed</span>
            </div>
          </div>

          {/* In Progress */}
          <div className="bg-white rounded-2xl p-6 border-2 border-slate-200 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold">
                Active
              </span>
            </div>
            <p className="text-sm text-slate-500 font-semibold uppercase tracking-wide mb-1">
              In Progress
            </p>
            <p className="text-3xl font-bold text-slate-900">{taskInProgress}</p>
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
              <Zap className="w-3 h-3" />
              <span>{taskUnderVerification} verification</span>
            </div>
          </div>

          {/* Team */}
          <div className="bg-white rounded-2xl p-6 border-2 border-slate-200 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-emerald-600" />
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
                {activeTeamMembers} Active
              </span>
            </div>
            <p className="text-sm text-slate-500 font-semibold uppercase tracking-wide mb-1">
              Team Members
            </p>
            <p className="text-3xl font-bold text-slate-900">{mockTeamMembers.length}</p>
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
              <Calendar className="w-3 h-3" />
              <span>{totalClients} clients</span>
            </div>
          </div>
        </div>

        {/* Task Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Task Status Breakdown */}
          <div className="bg-white rounded-2xl p-6 border-2 border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Task Status</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                <span className="text-sm font-medium text-slate-700">To Do</span>
                <span className="text-lg font-bold text-slate-900">{taskTodo}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50">
                <span className="text-sm font-medium text-blue-700">In Progress</span>
                <span className="text-lg font-bold text-blue-900">{taskInProgress}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-violet-50">
                <span className="text-sm font-medium text-violet-700">Under Verification</span>
                <span className="text-lg font-bold text-violet-900">{taskUnderVerification}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50">
                <span className="text-sm font-medium text-emerald-700">Done</span>
                <span className="text-lg font-bold text-emerald-900">{taskDone}</span>
              </div>
            </div>
          </div>

          {/* Recent Projects */}
          <div className="bg-white rounded-2xl p-6 border-2 border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Active Projects</h2>
            <div className="space-y-3">
              {mockProjects.filter(p => p.status === 'active').map((project: any) => {
                // Calculate active tasks for this project
                const projectTasks = mockTasks.filter((t: any) => t.projectId === project._id);
                const activeTasks = projectTasks.filter((t: any) => t.status !== 'done' && t.status !== 'completed');
                const totalTasks = projectTasks.length;
                
                return (
                  <div
                    key={project._id}
                    className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                        {project.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{project.name}</p>
                        <p className="text-xs text-slate-500">
                          {activeTasks.length} active task{activeTasks.length !== 1 ? 's' : ''} of {totalTasks} • {project.members?.length || 0} members
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      project.priority === 'high' 
                        ? 'bg-rose-100 text-rose-700' 
                        : project.priority === 'medium'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-blue-100 text-blue-700'
                    }`}>
                      {project.priority}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      
      {/* Floating Action Button for AI Task Creation */}
      <button
        onClick={() => setIsChatbotOpen(true)}
        className="fixed bottom-8 right-8 w-16 h-16 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-2xl hover:shadow-indigo-500/50 flex items-center justify-center transition-all hover:scale-110 z-40 group"
        title="Create Task with AI"
      >
        <Sparkles className="w-7 h-7 group-hover:rotate-12 transition-transform" />
      </button>
      
      <TaskPreviewDrawer
        task={selectedTask}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />
      <TaskChatbot
        isOpen={isChatbotOpen}
        onClose={() => setIsChatbotOpen(false)}
        onTaskCreated={(task) => {
          console.log('Task created:', task);
          // In a real app, this would add the task to the backend
        }}
      />
    </div>
  );
}