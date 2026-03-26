import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { mockProjects, mockTeamMembers, mockClients } from '../data/mockData';
import {
  Settings,
  Save,
  AlertTriangle,
  Archive,
  Trash2,
  Users,
  Shield,
  Bell,
  Palette,
  Code,
  Github,
  Globe,
  Lock,
  Crown,
  UserPlus,
  X,
  Check,
  Calendar,
  FolderKanban,
  FileText,
  Briefcase,
  Tag,
  Eye,
  Edit3,
} from 'lucide-react';

export function ProjectSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const project = mockProjects.find((p) => p._id === id);

  const [projectName, setProjectName] = useState(project?.name || '');
  const [projectDescription, setProjectDescription] = useState(project?.description || '');
  const [projectStatus, setProjectStatus] = useState(project?.status || 'active');
  const [selectedClient, setSelectedClient] = useState(project?.clientId || '');
  const [projectColor, setProjectColor] = useState('#6366f1');
  const [isPrivate, setIsPrivate] = useState(false);
  const [notifications, setNotifications] = useState({
    taskAssigned: true,
    taskCompleted: true,
    verificationNeeded: true,
    dailyDigest: false,
  });
  const [activeTab, setActiveTab] = useState('general');

  if (!project) {
    return (
      <div className="p-8">
        <p className="text-slate-600">Project not found.</p>
      </div>
    );
  }

  const handleSave = () => {
    console.log('💾 CODEX: Project settings saved', {
      projectId: id,
      projectName,
      changes: {
        name: projectName,
        description: projectDescription,
        status: projectStatus,
        clientId: selectedClient,
      },
      timestamp: new Date().toISOString(),
    });

    console.log('📡 MESSAGE COMMAND CENTER: Project settings updated', {
      event: 'PROJECT_SETTINGS_UPDATED',
      projectId: id,
      projectName,
      timestamp: new Date().toISOString(),
    });

    alert('Project settings saved successfully!');
  };

  const handleArchive = () => {
    if (confirm('Are you sure you want to archive this project? You can restore it later.')) {
      console.log('📦 CODEX: Project archived', {
        projectId: id,
        projectName,
        timestamp: new Date().toISOString(),
      });

      console.log('📡 MESSAGE COMMAND CENTER: Project archived', {
        event: 'PROJECT_ARCHIVED',
        projectId: id,
        projectName,
        timestamp: new Date().toISOString(),
      });

      navigate('/projects');
    }
  };

  const handleDelete = () => {
    if (confirm('⚠️ WARNING: This will permanently delete this project and all associated tasks, documents, and data. This action cannot be undone. Type "DELETE" to confirm.')) {
      console.log('🗑️ CODEX: Project deleted', {
        projectId: id,
        projectName,
        timestamp: new Date().toISOString(),
      });

      console.log('📡 MESSAGE COMMAND CENTER: Project permanently deleted', {
        event: 'PROJECT_DELETED',
        projectId: id,
        projectName,
        timestamp: new Date().toISOString(),
      });

      navigate('/projects');
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'team', label: 'Team & Access', icon: Users },
    { id: 'integrations', label: 'Integrations', icon: Code },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'danger', label: 'Danger Zone', icon: AlertTriangle },
  ];

  const projectColors = [
    { name: 'Indigo', value: '#6366f1' },
    { name: 'Purple', value: '#9333ea' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Rose', value: '#f43f5e' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Amber', value: '#f59e0b' },
    { name: 'Emerald', value: '#10b981' },
    { name: 'Teal', value: '#14b8a6' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Slate', value: '#64748b' },
  ];

  const teamMembers = [
    { ...mockTeamMembers[0], role: 'Owner', access: 'Admin' },
    { ...mockTeamMembers[1], role: 'Member', access: 'Editor' },
    { ...mockTeamMembers[2], role: 'Member', access: 'Viewer' },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Project Settings</h1>
            <p className="text-sm text-slate-500">{project.name}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-8 border-b-2 border-slate-200">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* General Settings */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border-2 border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-indigo-600" />
              Project Information
            </h3>

            <div className="space-y-6">
              {/* Project Name */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none transition-all text-sm"
                  placeholder="Enter project name"
                />
              </div>

              {/* Project Description */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">
                  Description
                </label>
                <textarea
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none transition-all text-sm resize-none"
                  placeholder="Describe your project..."
                />
              </div>

              {/* Client Selection */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">
                  Client
                </label>
                <select
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none transition-all text-sm"
                >
                  <option value="">No client</option>
                  {mockClients.map((client) => (
                    <option key={client._id} value={client._id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Project Status */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">
                  Status
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'active', label: 'Active', color: 'emerald' },
                    { value: 'on_hold', label: 'On Hold', color: 'amber' },
                    { value: 'completed', label: 'Completed', color: 'blue' },
                  ].map((status) => (
                    <button
                      key={status.value}
                      onClick={() => setProjectStatus(status.value)}
                      className={`px-4 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
                        projectStatus === status.value
                          ? `bg-${status.color}-50 border-${status.color}-300 text-${status.color}-700`
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {status.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Project Color */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">
                  <Palette className="w-3 h-3 inline mr-1" />
                  Project Color
                </label>
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-3">
                  {projectColors.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setProjectColor(color.value)}
                      className={`w-12 h-12 rounded-xl transition-all hover:scale-110 ${
                        projectColor === color.value
                          ? 'ring-4 ring-offset-2 ring-indigo-300'
                          : 'hover:ring-2 ring-slate-200'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              {/* Privacy */}
              <div>
                <label className="flex items-start gap-3 p-4 rounded-xl border-2 border-slate-200 hover:border-indigo-300 cursor-pointer transition-all">
                  <input
                    type="checkbox"
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                    className="mt-0.5 w-5 h-5 rounded border-2 border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Lock className="w-4 h-4 text-slate-600" />
                      <p className="text-sm font-semibold text-slate-900">Private Project</p>
                    </div>
                    <p className="text-xs text-slate-500">
                      Only team members with explicit access can view this project
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* Team & Access */}
      {activeTab === 'team' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border-2 border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                Team Members
              </h3>
              <button className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-semibold flex items-center gap-2 shadow-md hover:shadow-lg transition-all">
                <UserPlus className="w-4 h-4" />
                Add Member
              </button>
            </div>

            <div className="space-y-3">
              {teamMembers.map((member) => (
                <div
                  key={member._id}
                  className="flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 hover:border-indigo-200 transition-all"
                >
                  <img
                    src={member.avatar}
                    alt={`${member.firstName} ${member.lastName}`}
                    className="w-12 h-12 rounded-full border-2 border-white shadow-sm"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">
                      {member.firstName} {member.lastName}
                    </p>
                    <p className="text-xs text-slate-500">{member.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      defaultValue={member.access}
                      className="px-3 py-2 rounded-lg border-2 border-slate-200 text-sm font-medium focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none"
                    >
                      <option value="Admin">Admin</option>
                      <option value="Editor">Editor</option>
                      <option value="Viewer">Viewer</option>
                    </select>
                    {member.role !== 'Owner' && (
                      <button className="p-2 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-all">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    {member.role === 'Owner' && (
                      <span className="px-3 py-1.5 rounded-lg bg-amber-100 border border-amber-200 text-xs font-bold text-amber-700 flex items-center gap-1">
                        <Crown className="w-3 h-3" />
                        Owner
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Access Levels Info */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6">
            <h4 className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Access Levels
            </h4>
            <div className="space-y-2 text-xs text-blue-700">
              <p><strong>Admin:</strong> Full access including project settings and team management</p>
              <p><strong>Editor:</strong> Can create, edit, and delete tasks and content</p>
              <p><strong>Viewer:</strong> Read-only access to project content</p>
            </div>
          </div>
        </div>
      )}

      {/* Integrations */}
      {activeTab === 'integrations' && (
        <div className="space-y-6">
          {/* GitHub Integration */}
          <div className="bg-white rounded-2xl border-2 border-slate-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center">
                  <Github className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">GitHub</h3>
                  <p className="text-xs text-slate-500">Link your GitHub repository</p>
                </div>
              </div>
              <span className="px-3 py-1.5 rounded-lg bg-emerald-100 border border-emerald-200 text-xs font-bold text-emerald-700 flex items-center gap-1">
                <Check className="w-3 h-3" />
                Connected
              </span>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-sm font-medium text-slate-900 mb-1">acme-inc/task-manager</p>
              <p className="text-xs text-slate-500">Last synced: 5 minutes ago</p>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex gap-2">
                <button className="flex-1 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 border-2 border-slate-200 text-sm font-semibold text-slate-700 transition-all">
                  Change Repository
                </button>
                <button className="flex-1 px-4 py-2 rounded-lg bg-white hover:bg-rose-50 border-2 border-rose-200 hover:border-rose-300 text-sm font-semibold text-rose-600 transition-all">
                  Disconnect
                </button>
              </div>
              <button className="w-full px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-sm font-semibold text-white transition-all flex items-center justify-center gap-2 shadow-sm">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
                Fix Dev Repository
              </button>
            </div>
          </div>

          {/* Slack Integration */}
          <div className="bg-white rounded-2xl border-2 border-slate-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-purple-600 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Slack</h3>
                  <p className="text-xs text-slate-500">Get notifications in Slack</p>
                </div>
              </div>
              <span className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-bold text-slate-600">
                Not Connected
              </span>
            </div>
            <button className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all">
              Connect Slack
            </button>
          </div>

          {/* API Access */}
          <div className="bg-white rounded-2xl border-2 border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Code className="w-5 h-5 text-indigo-600" />
              API Access
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">
                  API Key
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value="sk_proj_a1b2c3d4e5f6g7h8"
                    readOnly
                    className="flex-1 px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 text-sm font-mono"
                  />
                  <button className="px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 border-2 border-slate-200 text-slate-700 font-semibold transition-all">
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <button className="text-sm text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4" />
                View API Documentation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border-2 border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Bell className="w-5 h-5 text-indigo-600" />
              Email Notifications
            </h3>

            <div className="space-y-4">
              {[
                {
                  key: 'taskAssigned',
                  label: 'Task Assigned',
                  description: 'Get notified when a task is assigned to you',
                },
                {
                  key: 'taskCompleted',
                  label: 'Task Completed',
                  description: 'Receive updates when team members complete tasks',
                },
                {
                  key: 'verificationNeeded',
                  label: 'Verification Needed',
                  description: 'Alert when tasks need your verification',
                },
                {
                  key: 'dailyDigest',
                  label: 'Daily Digest',
                  description: 'Daily summary of project activity',
                },
              ].map((item) => (
                <label
                  key={item.key}
                  className="flex items-start gap-3 p-4 rounded-xl border-2 border-slate-200 hover:border-indigo-300 cursor-pointer transition-all"
                >
                  <input
                    type="checkbox"
                    checked={notifications[item.key as keyof typeof notifications]}
                    onChange={(e) =>
                      setNotifications({
                        ...notifications,
                        [item.key]: e.target.checked,
                      })
                    }
                    className="mt-0.5 w-5 h-5 rounded border-2 border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900 mb-1">{item.label}</p>
                    <p className="text-xs text-slate-500">{item.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
            >
              <Save className="w-4 h-4" />
              Save Preferences
            </button>
          </div>
        </div>
      )}

      {/* Danger Zone */}
      {activeTab === 'danger' && (
        <div className="space-y-6">
          {/* Archive Project */}
          <div className="bg-white rounded-2xl border-2 border-amber-200 p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <Archive className="w-6 h-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900 mb-2">Archive Project</h3>
                <p className="text-sm text-slate-600 mb-4">
                  Archive this project to hide it from your active projects list. You can restore it at any time.
                </p>
                <button
                  onClick={handleArchive}
                  className="px-4 py-2 rounded-lg bg-amber-100 hover:bg-amber-200 border-2 border-amber-300 text-amber-700 font-semibold transition-all"
                >
                  Archive Project
                </button>
              </div>
            </div>
          </div>

          {/* Delete Project */}
          <div className="bg-white rounded-2xl border-2 border-rose-200 p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Project</h3>
                <div className="bg-rose-50 border-2 border-rose-200 rounded-xl p-4 mb-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-rose-700">
                      <p className="font-bold mb-1">Warning: This action cannot be undone!</p>
                      <p>This will permanently delete:</p>
                      <ul className="list-disc ml-4 mt-1">
                        <li>All tasks and subtasks</li>
                        <li>All project documents and files</li>
                        <li>All time tracking data</li>
                        <li>All project history and activity logs</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold transition-all shadow-md hover:shadow-lg"
                >
                  Delete Project Permanently
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// MessageSquare icon component (if not available)
const MessageSquare = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);