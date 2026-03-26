import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/MockAuthContext';
import { mockTasks, mockProjects } from '../data/mockData';
import {
  CheckCircle,
  Clock,
  Filter,
  Eye,
  User,
  Briefcase,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import { TaskPreviewDrawer } from '../components/TaskPreviewDrawer';

const formatDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600)
    .toString()
    .padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60)
    .toString()
    .padStart(2, '0');
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0');
  return `${h}:${m}:${s}`;
};

const formatDateTime = (value?: string | Date) => {
  if (!value) return 'Unknown time';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  return date.toLocaleString();
};

const getUserLabel = (value: any) => {
  if (!value) return 'Not assigned';
  if (typeof value === 'string') return value;
  const fullName = [value.firstName, value.lastName].filter(Boolean).join(' ').trim();
  return fullName || value.email || 'Unknown user';
};

export function VerificationsPage() {
  const { user } = useAuth();
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [selectedTask, setSelectedTask] = useState<any>(null);

  const projectNameById = useMemo(
    () =>
      new Map(
        mockProjects.map((project: any) => [
          project?._id?.toString?.() || project?._id,
          project?.name || 'Untitled Project',
        ])
      ),
    []
  );

  const getId = (value: any) => value?._id?.toString?.() || value?.toString?.() || '';
  const myId = user?.id?.toString?.() || '';
  const canSeeAll = user?.role === 'admin' || user?.role === 'client';

  const matchesProjectFilter = (task: any) => {
    if (selectedProjectId === 'all') return true;
    const taskProjectId = task?.projectId?._id?.toString?.() || task?.projectId?.toString?.() || '';
    return taskProjectId === selectedProjectId;
  };

  const isRelatedToMe = (task: any) => {
    if (canSeeAll) return true;
    const verifierId = getId(task?.verifierId);
    const assigneeId = getId(task?.assigneeId);
    const activeWorkerId = getId(task?.activeWorkerId);
    const workedByMe =
      Array.isArray(task?.workLogs) &&
      task.workLogs.some((log: any) => getId(log?.userId) === myId);
    return verifierId === myId || assigneeId === myId || activeWorkerId === myId || workedByMe;
  };

  const pending = mockTasks.filter((task: any) => {
    const isVerificationTask =
      task?.verificationStatus === 'pending' || task?.status === 'under_verification';
    return isVerificationTask && isRelatedToMe(task) && matchesProjectFilter(task);
  });

  const latestApproved = mockTasks
    .filter(
      (task: any) =>
        task?.verificationStatus === 'approved' &&
        isRelatedToMe(task) &&
        matchesProjectFilter(task)
    )
    .sort((a: any, b: any) => {
      const aTime = new Date(a?.verificationDecidedAt || a?.updatedAt || 0).getTime();
      const bTime = new Date(b?.verificationDecidedAt || b?.updatedAt || 0).getTime();
      return bTime - aTime;
    })
    .slice(0, 12);

  return (
    <div className="min-h-full p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                <span>Home</span>
                <span>›</span>
                <span className="text-slate-600 font-semibold">Verifications</span>
              </div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">
                Task Verifications
              </h1>
              <p className="text-slate-600">Review and approve completed tasks</p>
            </div>

            {/* Project Filter */}
            <div className="flex items-center gap-3">
              <Filter className="w-5 h-5 text-slate-400" />
              <label
                htmlFor="verification-project-filter"
                className="text-sm font-bold text-slate-600"
              >
                Project:
              </label>
              <select
                id="verification-project-filter"
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="h-10 rounded-lg border-2 border-slate-200 bg-white px-4 text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">All Projects</option>
                {mockProjects.map((project: any) => (
                  <option key={project._id} value={project._id?.toString?.() || project._id}>
                    {project.name || 'Untitled Project'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-amber-700 font-bold mb-1">
                    Pending Review
                  </p>
                  <p className="text-3xl font-bold text-amber-900">{pending.length}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-emerald-700 font-bold mb-1">
                    Approved
                  </p>
                  <p className="text-3xl font-bold text-emerald-900">{latestApproved.length}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-indigo-700 font-bold mb-1">
                    Total Tasks
                  </p>
                  <p className="text-3xl font-bold text-indigo-900">
                    {pending.length + latestApproved.length}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-indigo-500 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Verifications */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-amber-600" />
            <h2 className="text-xl font-bold text-slate-900">Pending Verifications</h2>
            {pending.length > 0 && (
              <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                {pending.length}
              </span>
            )}
          </div>

          {pending.length === 0 ? (
            <div className="bg-white rounded-2xl border-2 border-slate-200 p-12 text-center shadow-sm">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-100 mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <p className="text-slate-600 font-medium mb-1">
                {canSeeAll
                  ? 'No verification tasks found across projects.'
                  : 'No verification tasks related to you across projects.'}
              </p>
              <p className="text-sm text-slate-400">All caught up! Great work.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {pending.map((task: any) => {
                const projectId =
                  task?.projectId?._id?.toString?.() || task?.projectId?.toString?.() || '';
                const projectName =
                  task?.projectId?.name || projectNameById.get(projectId) || 'Unknown Project';
                return (
                  <div
                    key={task._id}
                    className="group bg-white border-2 border-slate-200 hover:border-indigo-300 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer"
                    onClick={() => setSelectedTask(task)}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {task.title}
                      </h3>
                      <button className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-600 opacity-0 group-hover:opacity-100 transition-all">
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Briefcase className="w-4 h-4 text-slate-400" />
                        <span className="font-medium">{projectName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <User className="w-4 h-4 text-slate-400" />
                        <span>Testing by: {getUserLabel(task?.verifierId)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span>
                          Total worked:{' '}
                          {formatDuration(
                            Number(task.totalWorkedSecondsComputed || task.totalWorkedSeconds || 0)
                          )}
                        </span>
                      </div>
                    </div>

                    {Array.isArray(task.workLogs) && task.workLogs.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                          Work Breakdown
                        </p>
                        <div className="space-y-1.5">
                          {task.workLogs.map((log: any, idx: number) => {
                            const name = log.userId
                              ? `${log.userId.firstName || ''} ${log.userId.lastName || ''}`
                                  .trim() || log.userId.email
                              : 'Unknown user';
                            return (
                              <div key={idx} className="flex items-center justify-between text-xs">
                                <span className="text-slate-600">{name}</span>
                                <span className="font-bold text-slate-900">
                                  {formatDuration(Number(log.seconds || 0))}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Latest Approved */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="w-6 h-6 text-emerald-600" />
            <h2 className="text-xl font-bold text-slate-900">Latest Verified Tasks by Team</h2>
          </div>

          {latestApproved.length === 0 ? (
            <div className="bg-white rounded-2xl border-2 border-slate-200 p-12 text-center shadow-sm">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100 mb-4">
                <CheckCircle className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-600 font-medium">No approved verifications yet.</p>
              <p className="text-sm text-slate-400 mt-1">Completed tasks will appear here</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {latestApproved.map((task: any) => {
                const projectId =
                  task?.projectId?._id?.toString?.() || task?.projectId?.toString?.() || '';
                const projectName =
                  task?.projectId?.name || projectNameById.get(projectId) || 'Unknown Project';
                return (
                  <div
                    key={`approved-${task._id}`}
                    className="bg-white border-2 border-emerald-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all"
                  >
                    <div className="flex items-start gap-2 mb-3">
                      <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5" />
                      <h3 className="text-base font-bold text-slate-900">{task.title}</h3>
                    </div>
                    <div className="space-y-2 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-slate-400" />
                        <span>{projectName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400" />
                        <span>Verified by: {getUserLabel(task?.verifierId)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span>
                          {formatDateTime(task?.verificationDecidedAt || task?.updatedAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Task Detail Modal */}
        {selectedTask && (
          <TaskPreviewDrawer
            task={selectedTask}
            isOpen={!!selectedTask}
            onClose={() => setSelectedTask(null)}
          />
        )}
      </div>
    </div>
  );
}