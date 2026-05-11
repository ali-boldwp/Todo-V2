import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProjects, getClients, createProject } from '../../services/core';
import { useAuth } from '../../context/AuthContext';
import {
  FolderKanban,
  Plus,
  Search,
  ArrowRight,
  Users,
  Calendar,
  Flag,
  X,
  Loader2,
} from 'lucide-react';

const EMPTY_FORM = {
  name: '',
  clientId: '',
  status: 'active' as const,
  priority: 'medium' as const,
  startDate: '',
  endDate: '',
};

export function ProjectsListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [formError, setFormError] = useState('');

  const canCreateProject = user?.role === 'admin' || user?.role === 'client';

  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: getProjects });
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: getClients,
    enabled: user?.role === 'admin',
  });

  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setIsModalOpen(false);
      setForm({ ...EMPTY_FORM });
      setFormError('');
    },
    onError: (err: any) => {
      setFormError(err?.response?.data?.message || 'Failed to create project');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!form.name.trim()) { setFormError('Project name is required'); return; }
    createMutation.mutate({
      name: form.name.trim(),
      clientId: form.clientId || undefined,
      status: form.status,
      priority: form.priority,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
    } as any);
  };

  const filteredProjects = projects.filter((project: any) =>
    project.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'completed':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'archived':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'medium':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'low':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="min-h-full p-8">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">
                Projects
              </h1>
              <p className="text-slate-600">
                Manage and organize all your projects in one place
              </p>
            </div>
            {canCreateProject && (
              <button
                onClick={() => { setIsModalOpen(true); setForm({ ...EMPTY_FORM }); setFormError(''); }}
                className="h-11 px-6 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
              >
                <Plus size={18} strokeWidth={2.5} />
                New Project
              </button>
            )}
          </div>

          {/* Search Bar */}
          <div className="flex items-center gap-2 px-4 py-3 bg-white rounded-lg border-2 border-slate-200 hover:border-indigo-300 transition-colors max-w-md">
            <Search size={18} className="text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search projects..."
              className="flex-1 bg-transparent outline-none text-sm text-slate-700 placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-emerald-700 uppercase tracking-wide mb-1">
                  Active Projects
                </p>
                <p className="text-3xl font-bold text-emerald-900">
                  {projects.filter((p: any) => p.status === 'active').length}
                </p>
              </div>
              <div className="w-14 h-14 rounded-xl bg-emerald-500 flex items-center justify-center">
                <FolderKanban className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-blue-700 uppercase tracking-wide mb-1">
                  Completed
                </p>
                <p className="text-3xl font-bold text-blue-900">
                  {projects.filter((p: any) => p.status === 'completed').length}
                </p>
              </div>
              <div className="w-14 h-14 rounded-xl bg-blue-500 flex items-center justify-center">
                <FolderKanban className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-slate-50 to-gray-50 border-2 border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-1">
                  Total Projects
                </p>
                <p className="text-3xl font-bold text-slate-900">
                  {projects.length}
                </p>
              </div>
              <div className="w-14 h-14 rounded-xl bg-slate-500 flex items-center justify-center">
                <FolderKanban className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.length === 0 ? (
            <div className="col-span-full py-16 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-slate-100 mb-4">
                <Search className="w-10 h-10 text-slate-400" />
              </div>
              <p className="text-slate-600 font-medium">No projects found</p>
              <p className="text-sm text-slate-400 mt-1">
                Try adjusting your search or create a new project
              </p>
            </div>
          ) : (
            filteredProjects.map((project: any, index: number) => (
              <div
                key={project._id}
                onClick={() => navigate(`/project/${project._id}/overview`)}
                className="group bg-white rounded-2xl border-2 border-slate-200 hover:border-indigo-300 shadow-sm hover:shadow-xl transition-all cursor-pointer overflow-hidden"
                style={{ animation: `fadeIn 0.3s ease ${index * 0.05}s both` }}
              >
                {/* Project Header */}
                <div className="h-24 bg-gradient-to-br from-indigo-500 to-purple-600 p-5 relative overflow-hidden">
                  <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full" />
                  <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full" />
                  <div className="relative">
                    <div className="flex items-start justify-between">
                      <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <FolderKanban className="w-6 h-6 text-white" />
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full border-2 text-xs font-bold ${getStatusColor(
                          project.status
                        )}`}
                      >
                        {project.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Project Content */}
                <div className="p-5">
                  <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">
                    {project.name}
                  </h3>

                  {/* Project Meta */}
                  <div className="space-y-2 mb-4">
                    {project.clientId && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Users size={14} className="text-slate-400" />
                        <span>Client: {project.clientId.name}</span>
                      </div>
                    )}
                    {project.endDate && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Calendar size={14} className="text-slate-400" />
                        <span>Due: {new Date(project.endDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Flag size={14} className="text-slate-400" />
                      <span
                        className={`px-2 py-0.5 rounded-full border text-xs font-bold ${getPriorityColor(
                          project.priority
                        )}`}
                      >
                        {project.priority} priority
                      </span>
                    </div>
                  </div>

                  {/* Team Members */}
                  {project.members && project.members.length > 0 && (
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex -space-x-2">
                        {project.members.slice(0, 3).map((member: any, idx: number) => (
                          <div
                            key={idx}
                            className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 border-2 border-white text-white text-xs font-bold flex items-center justify-center"
                          >
                            {member.firstName?.[0]}
                            {member.lastName?.[0]}
                          </div>
                        ))}
                      </div>
                      <span className="text-xs text-slate-500 font-medium">
                        {project.members.length} member{project.members.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}

                  {/* Action Button */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <span className="text-sm font-semibold text-slate-600 group-hover:text-indigo-600 transition-colors">
                      View Details
                    </span>
                    <ArrowRight
                      size={18}
                      className="text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all"
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(15px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>

    {/* ── Create Project Modal ── */}
    {isModalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <FolderKanban className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">New Project</h2>
                <p className="text-sm text-slate-500">Fill in the details to get started</p>
              </div>
            </div>
            <button
              onClick={() => setIsModalOpen(false)}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">

            {/* Project Name */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Project Name <span className="text-rose-500">*</span></label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. E-Commerce Platform"
                className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-indigo-400 focus:outline-none text-sm text-slate-800 placeholder:text-slate-400 transition-colors"
                autoFocus
              />
            </div>

            {/* Client (admin only) */}
            {user?.role === 'admin' && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Client</label>
                <select
                  value={form.clientId}
                  onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-indigo-400 focus:outline-none text-sm text-slate-800 bg-white transition-colors"
                >
                  <option value="">No client</option>
                  {(clients as any[]).map((c: any) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Status + Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Status</label>
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-indigo-400 focus:outline-none text-sm text-slate-800 bg-white transition-colors"
                >
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="on_hold">On Hold</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Priority</label>
                <select
                  value={form.priority}
                  onChange={e => setForm(f => ({ ...f, priority: e.target.value as any }))}
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-indigo-400 focus:outline-none text-sm text-slate-800 bg-white transition-colors"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Start Date</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-indigo-400 focus:outline-none text-sm text-slate-800 bg-white transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">End Date</label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-indigo-400 focus:outline-none text-sm text-slate-800 bg-white transition-colors"
                />
              </div>
            </div>

            {/* Error */}
            {formError && (
              <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700 font-medium">
                {formError}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={createMutation.isPending}
                className="px-5 py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {createMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : <><Plus className="w-4 h-4" /> Create Project</>}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
  );
}
