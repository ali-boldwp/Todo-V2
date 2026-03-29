import { useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { getProject } from '../../services/core';
import { getTasks } from '../../services/task';
import {
  Flag,
  Eye,
  Users,
  Clock,
  Building2,
  CalendarDays,
  GitBranch,
  TrendingUp,
  FileText,
} from 'lucide-react';
import RichTextEditor from '../components/RichTextEditor';

export function ProjectOverviewPage() {
  const { id } = useParams<{ id: string }>();
  
  const { data: project } = useQuery({ 
    queryKey: ['project', id], 
    queryFn: () => getProject(id!),
    enabled: !!id
  });
  
  const { data: projectTasks = [] } = useQuery({ 
    queryKey: ['tasks', id], 
    queryFn: () => getTasks(id!),
    enabled: !!id
  });

  if (!project) {
    return (
      <div className="min-h-full flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-lg font-semibold text-slate-700">Project not found</p>
          <p className="text-sm text-slate-500 mt-1">The project you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const STATUS_STYLE: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    completed: 'bg-blue-100 text-blue-700 border-blue-200',
    archived: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const PRIORITY_STYLE: Record<string, string> = {
    low: 'text-blue-700 bg-blue-100 border-blue-200',
    medium: 'text-amber-700 bg-amber-100 border-amber-200',
    high: 'text-rose-700 bg-rose-100 border-rose-200',
  };

  const totalTasks = projectTasks.length;
  const doneTasks = projectTasks.filter((t: any) => t.status === 'done').length;
  const inProgressTasks = projectTasks.filter((t: any) => t.status === 'in_progress').length;
  const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
    <div className="min-h-full p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Project Header Card */}
        <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-2">
                Project Overview
              </p>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                {project.name}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1.5 rounded-full border-2 text-sm font-bold ${STATUS_STYLE[project.status] || STATUS_STYLE.active}`}>
                {project.status}
              </span>
            </div>
          </div>

          {/* Project Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-6">
            <div className="rounded-xl border-2 border-slate-200 bg-gradient-to-br from-slate-50 to-gray-50 p-4">
              <div className="flex items-center gap-2 text-slate-600 text-sm font-bold uppercase tracking-wide mb-2">
                <Flag size={16} />
                Priority
              </div>
              <div className={`inline-flex px-3 py-1.5 rounded-lg border-2 text-sm font-bold uppercase ${PRIORITY_STYLE[project.priority] || PRIORITY_STYLE.medium}`}>
                {project.priority}
              </div>
            </div>

            <div className="rounded-xl border-2 border-slate-200 bg-gradient-to-br from-slate-50 to-gray-50 p-4">
              <div className="flex items-center gap-2 text-slate-600 text-sm font-bold uppercase tracking-wide mb-2">
                <Eye size={16} />
                Visibility
              </div>
              <div className="text-base font-bold text-slate-900 capitalize">
                {project.visibility || 'private'}
              </div>
            </div>

            <div className="rounded-xl border-2 border-slate-200 bg-gradient-to-br from-slate-50 to-gray-50 p-4">
              <div className="flex items-center gap-2 text-slate-600 text-sm font-bold uppercase tracking-wide mb-2">
                <Users size={16} />
                Team Members
              </div>
              <div className="text-base font-bold text-slate-900">
                {project.members?.length || 0}
              </div>
            </div>

            <div className="rounded-xl border-2 border-slate-200 bg-gradient-to-br from-slate-50 to-gray-50 p-4">
              <div className="flex items-center gap-2 text-slate-600 text-sm font-bold uppercase tracking-wide mb-2">
                <Clock size={16} />
                Timeline
              </div>
              <div className="text-base font-bold text-emerald-700">
                {project.endDate ? `Due ${new Date(project.endDate).toLocaleDateString()}` : 'No deadline'}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Card */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-2xl p-8 shadow-sm">
          <h2 className="text-lg font-bold text-indigo-900 mb-6">Project Statistics</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 border-2 border-indigo-100">
              <p className="text-xs uppercase tracking-wide text-slate-600 font-bold mb-1">
                Total Tasks
              </p>
              <p className="text-2xl font-bold text-slate-900">{totalTasks}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border-2 border-emerald-100">
              <p className="text-xs uppercase tracking-wide text-slate-600 font-bold mb-1">
                Completed
              </p>
              <p className="text-2xl font-bold text-emerald-700">
                {doneTasks} ({completionRate}%)
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 border-2 border-blue-100">
              <p className="text-xs uppercase tracking-wide text-slate-600 font-bold mb-1">
                In Progress
              </p>
              <p className="text-2xl font-bold text-blue-700">{inProgressTasks}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border-2 border-violet-100">
              <p className="text-xs uppercase tracking-wide text-slate-600 font-bold mb-1">
                Completion Rate
              </p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-violet-700">{completionRate}%</p>
                <TrendingUp className="w-5 h-5 text-violet-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Project Details */}
          <div className="xl:col-span-1 bg-white rounded-2xl border-2 border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Project Details</h2>
            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <Building2 size={18} className="text-slate-400 mt-0.5" />
                <div>
                  <p className="text-slate-500 text-xs uppercase tracking-wide font-bold mb-1">
                    Client
                  </p>
                  <p className="font-semibold text-slate-900">
                    {project.clientId?.name || 'Not assigned'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CalendarDays size={18} className="text-slate-400 mt-0.5" />
                <div>
                  <p className="text-slate-500 text-xs uppercase tracking-wide font-bold mb-1">
                    Dates
                  </p>
                  <p className="font-semibold text-slate-900">
                    Start: {project.startDate ? new Date(project.startDate).toLocaleDateString() : 'Not set'}
                  </p>
                  <p className="font-semibold text-slate-900">
                    End: {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'Not set'}
                  </p>
                </div>
              </div>

              {project.githubRepoOwner && project.githubRepoName && (
                <div className="flex items-start gap-3">
                  <GitBranch size={18} className="text-slate-400 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-slate-500 text-xs uppercase tracking-wide font-bold mb-1">
                      Repository
                    </p>
                    <a
                      href={`https://github.com/${project.githubRepoOwner}/${project.githubRepoName}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-indigo-600 hover:text-indigo-700 break-all"
                    >
                      {project.githubRepoOwner}/{project.githubRepoName}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Project Description */}
          <div className="xl:col-span-2 bg-white rounded-2xl border-2 border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-slate-600" />
              <h2 className="text-lg font-bold text-slate-900">Overview Notes</h2>
            </div>
            {project.description && typeof project.description !== 'string' && project.description.blocks?.length > 0 ? (
              <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
                <RichTextEditor
                  holder={`project-overview-desc-${id}`}
                  data={project.description}
                  onChange={() => {}}
                  readOnly={true}
                />
              </div>
            ) : (
              <div className="prose prose-sm max-w-none">
                <p className="text-slate-600">
                  Use this section to document project goals, architecture decisions, and important
                  notes. This acts as the source of truth for the entire project team.
                </p>
                <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-sm text-slate-500 italic">
                    No description added yet. Go to settings to add project documentation.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}