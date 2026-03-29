import { useState, useMemo } from 'react';
import { useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { getTasks } from '../../services/task';
import {
  Plus,
  Search,
  ArrowUp,
  ArrowDown,
  Check,
  Eye,
  ChevronDown,
  Calendar,
  Sparkles,
  Table as TableIcon,
  LayoutGrid,
} from 'lucide-react';
import { TaskPreviewDrawer } from '../components/TaskPreviewDrawer';
import { TaskChatbot } from '../components/TaskChatbot';
import CreateTaskDrawer from '../components/CreateTaskDrawer';

const STATUS_LABELS: any = {
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
  under_verification: 'Under Verification',
  clarification: 'Clarification',
  clarified: 'Clarified',
};

const SECTION_ORDER = ['clarification', 'todo', 'in_progress', 'under_verification', 'review', 'clarified', 'done'];

export function ProjectTasksPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const [searchTerm, setSearchTerm] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [createTaskStatus, setCreateTaskStatus] = useState<string>('todo');
  const [viewMode, setViewMode] = useState<'board' | 'table'>('table');

  const { data: projectTasks = [] } = useQuery({ 
    queryKey: ['tasks', projectId], 
    queryFn: () => getTasks(projectId!),
    enabled: !!projectId
  });

  const filteredTasks = useMemo(
    () => projectTasks.filter((task: any) => 
      task.title.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [projectTasks, searchTerm]
  );

  const sections = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    for (const task of filteredTasks) {
      const key = task.status || 'todo';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(task);
    }
    const orderedKeys = [
      ...SECTION_ORDER,
      ...Object.keys(grouped).filter((k) => !SECTION_ORDER.includes(k)),
    ].filter((k, idx, arr) => arr.indexOf(k) === idx && grouped[k]?.length);
    
    return orderedKeys.map((key) => ({ 
      key, 
      label: STATUS_LABELS[key] || key, 
      tasks: grouped[key] || [] 
    }));
  }, [filteredTasks]);

  const remainingCount = filteredTasks.filter((t: any) => t.status !== 'done').length;

  const priorityIcon = (priority: string) => {
    if (priority === 'high') return <ArrowUp className="w-4 h-4 text-rose-500" strokeWidth={2.5} />;
    if (priority === 'medium') return <ArrowUp className="w-4 h-4 text-amber-500" strokeWidth={2.5} />;
    return <ArrowDown className="w-4 h-4 text-emerald-500" strokeWidth={2.5} />;
  };

  const getSectionColor = (key: string) => {
    switch (key) {
      case 'clarification':
        return 'border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50';
      case 'todo':
        return 'border-slate-200 bg-gradient-to-r from-slate-50 to-gray-50';
      case 'in_progress':
        return 'border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50';
      case 'under_verification':
        return 'border-violet-200 bg-gradient-to-r from-violet-50 to-purple-50';
      case 'review':
        return 'border-indigo-200 bg-gradient-to-r from-indigo-50 to-blue-50';
      case 'done':
        return 'border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50';
      default:
        return 'border-slate-200 bg-slate-50';
    }
  };

  const getSectionTitleColor = (key: string) => {
    switch (key) {
      case 'clarification':
        return 'text-amber-700';
      case 'todo':
        return 'text-slate-700';
      case 'in_progress':
        return 'text-blue-700';
      case 'under_verification':
        return 'text-violet-700';
      case 'review':
        return 'text-indigo-700';
      case 'done':
        return 'text-emerald-700';
      default:
        return 'text-slate-700';
    }
  };

  return (
    <div className="min-h-full">
      {/* Page Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-6 shadow-sm">
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
              <span>Home</span>
              <span>›</span>
              <span>Projects</span>
              <span>›</span>
              <span className="text-slate-600 font-semibold">Tasks</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Project Tasks</h1>
            <p className="text-sm text-slate-500 mt-1">{remainingCount} tasks remaining</p>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center p-1 bg-slate-100 rounded-lg">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md flex items-center justify-center transition-all ${
                  viewMode === 'table' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'
                }`}
                title="Table View"
              >
                <TableIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('board')}
                className={`p-1.5 rounded-md flex items-center justify-center transition-all ${
                  viewMode === 'board' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'
                }`}
                title="Board View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            {/* Search */}
            <div className="h-10 w-60 border border-slate-200 rounded-lg px-3 flex items-center gap-2 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all bg-white">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search tasks..."
                className="w-full bg-transparent outline-none text-sm text-slate-700 placeholder:text-slate-400"
              />
            </div>

            {/* Create Manual */}
            <button 
              onClick={() => {
                setCreateTaskStatus('todo');
                setIsCreateDrawerOpen(true);
              }}
              className="h-10 px-4 rounded-lg border-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-sm font-semibold flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Task
            </button>

            {/* Add Task Button */}
            <button 
              onClick={() => setIsChatbotOpen(true)}
              className="h-10 px-5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-semibold flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
            >
              <Sparkles className="w-4 h-4" strokeWidth={2.5} />
              Create with AI
            </button>
          </div>
        </div>
      </div>

      {/* Tasks Content */}
      <div className="p-8">
        {filteredTasks.length === 0 ? (
          <div className="py-20 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
              <Check className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-500 font-medium">No tasks found</p>
            <p className="text-sm text-slate-400 mt-1">Try adjusting your search or create a new task</p>
          </div>
        ) : viewMode === 'table' ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" style={{ animation: `fadeIn 0.3s ease both` }}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Title</th>
                    <th className="px-6 py-4">Priority</th>
                    <th className="px-6 py-4">Assignee</th>
                    <th className="px-6 py-4">Due Date</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTasks.map((task: any) => (
                    <tr 
                      key={task._id} 
                      className="hover:bg-slate-50 transition-colors group cursor-pointer"
                      onClick={() => {
                        setSelectedTask(task);
                        setIsDrawerOpen(true);
                      }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                          task.status === 'done' ? 'bg-emerald-100 text-emerald-800' :
                          task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          task.status === 'review' ? 'bg-indigo-100 text-indigo-800' :
                          task.status === 'under_verification' ? 'bg-violet-100 text-violet-800' :
                          task.status === 'clarification' ? 'bg-amber-100 text-amber-800' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                          {STATUS_LABELS[task.status] || task.status || 'To Do'}
                        </span>
                      </td>
                      <td className="px-6 py-4 min-w-[250px]">
                        <div className={`text-sm font-medium ${task.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                          {task.title}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {priorityIcon(task.priority || 'medium')}
                          <span className="text-sm text-slate-600 capitalize">{task.priority || 'medium'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {task.assigneeId ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
                              {task.assigneeId.firstName?.[0]}{task.assigneeId.lastName?.[0]}
                            </div>
                            <span className="text-sm text-slate-600">
                              {task.assigneeId.firstName} {task.assigneeId.lastName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {task.dueDate ? (
                         <div className="flex items-center gap-1.5 text-sm text-slate-600">
                           <Calendar className="w-4 h-4 text-slate-400" />
                           <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                         </div>
                        ) : (
                          <span className="text-sm text-slate-400 italic">No date</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          className="opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-indigo-600 transition-all focus:opacity-100"
                          title="View Details"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTask(task);
                            setIsDrawerOpen(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : sections.length === 0 ? (
          <div className="py-20 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
              <Check className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-500 font-medium">No tasks found in board view</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {sections.map((section, index) => {
              const isCollapsed = !!collapsed[section.key];
              
              return (
                <div
                  key={section.key}
                  className={`rounded-2xl border-2 ${getSectionColor(section.key)} shadow-sm overflow-hidden`}
                  style={{ animation: `fadeIn 0.3s ease ${index * 0.1}s both` }}
                >
                  {/* Section Header */}
                  <button
                    onClick={() => setCollapsed((prev) => ({ ...prev, [section.key]: !prev[section.key] }))}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`text-sm font-bold ${getSectionTitleColor(section.key)}`}>
                        {section.label}
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-white/60 text-xs font-semibold text-slate-600">
                        {section.tasks.length}
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform ${isCollapsed ? '-rotate-180' : ''}`}
                    />
                  </button>

                  {/* Task List */}
                  {!isCollapsed && (
                    <div className="px-4 pb-4 space-y-2">
                      {section.tasks.map((task: any) => (
                        <div
                          key={task._id}
                          onClick={() => {
                            setSelectedTask(task);
                            setIsDrawerOpen(true);
                          }}
                          className="group bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer"
                        >
                          <div className="flex items-start gap-3">
                            <button
                              onClick={(e) => e.stopPropagation()}
                              className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                                task.status === 'done'
                                  ? 'bg-emerald-500 border-emerald-500'
                                  : 'border-slate-300 hover:border-indigo-500 hover:bg-indigo-50'
                              }`}
                            >
                              {task.status === 'done' && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                            </button>

                            {/* Task Content */}
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium ${
                                task.status === 'done' 
                                  ? 'text-slate-400 line-through' 
                                  : 'text-slate-900'
                              }`}>
                                {task.title}
                              </p>

                              {/* Task Meta */}
                              <div className="flex items-center gap-3 mt-2">
                                {/* Priority */}
                                <div className="flex items-center gap-1">
                                  {priorityIcon(task.priority || 'medium')}
                                </div>

                                {/* Due Date */}
                                {task.dueDate && (
                                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                    <Calendar className="w-3 h-3" />
                                    <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                                  </div>
                                )}

                                {/* Assignee */}
                                {task.assigneeId && (
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 text-white text-[9px] font-bold flex items-center justify-center">
                                      {task.assigneeId.firstName?.[0]}{task.assigneeId.lastName?.[0]}
                                    </div>
                                    <span className="text-xs text-slate-500">
                                      {task.assigneeId.firstName} {task.assigneeId.lastName}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Quick Actions */}
                            <button
                              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
                              title="View Details"
                              onClick={() => {
                                setSelectedTask(task);
                                setIsDrawerOpen(true);
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Add Task to Section */}
                      <button 
                        onClick={() => {
                          setCreateTaskStatus(section.key);
                          setIsCreateDrawerOpen(true);
                        }}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 text-slate-400 hover:text-indigo-600 transition-all group"
                      >
                        <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" strokeWidth={2} />
                        <span className="text-sm font-medium">Add task</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      {/* Task Preview Drawer */}
      <TaskPreviewDrawer
        task={selectedTask}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />

      {/* Create Task Drawer */}
      <CreateTaskDrawer
        isOpen={isCreateDrawerOpen}
        onClose={() => setIsCreateDrawerOpen(false)}
        initialProjectId={projectId}
        initialStatus={createTaskStatus}
      />

      {/* Task Chatbot */}
      <TaskChatbot
        isOpen={isChatbotOpen}
        onClose={() => setIsChatbotOpen(false)}
        initialProjectId={projectId}
        onTaskCreated={(task) => {
          console.log('Task created:', task);
          setIsChatbotOpen(false);
        }}
      />
    </div>
  );
}