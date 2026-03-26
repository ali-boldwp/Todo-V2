import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { getProjects } from '../../services/core';
import {
  FolderKanban,
  Plus,
  Search,
  ArrowRight,
  Users,
  Calendar,
  Flag,
} from 'lucide-react';

export function ProjectsListPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: getProjects });

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
            <button className="h-11 px-6 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold flex items-center gap-2 shadow-md hover:shadow-lg transition-all">
              <Plus size={18} strokeWidth={2.5} />
              New Project
            </button>
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
          from {
            opacity: 0;
            transform: translateY(15px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
