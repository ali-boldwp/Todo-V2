import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { getTeamMembers } from '../../services/team';
import { getTasks } from '../../services/task';
import { getProjects } from '../../services/core';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  CheckCircle,
  TrendingUp,
  Award,
  Target,
  Briefcase,
  ArrowLeft,
  Edit3,
  MessageSquare,
  MoreVertical,
  Github,
  Linkedin,
  Twitter,
  Star,
  Activity,
  FileText,
  Users,
  Zap,
  Code,
  TrendingDown,
} from 'lucide-react';

export function TeamMemberProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  const { data: teamMembers = [] } = useQuery({ 
    queryKey: ['teamMembers'], 
    queryFn: getTeamMembers
  });
  const member = teamMembers.find((m: any) => m._id === id);
  
  const { data: memberTasks = [] } = useQuery({ 
    queryKey: ['tasks', 'assignee', id], 
    queryFn: () => getTasks('' as any).then((tasks: any) => tasks.filter((t: any) => t.assigneeId?._id === id)),
    enabled: !!id
  });
  
  const { data: allProjects = [] } = useQuery({ 
    queryKey: ['projects'], 
    queryFn: getProjects 
  });

  if (!member) {
    return (
      <div className="p-8">
        <p className="text-slate-600">Loading or team member not found...</p>
      </div>
    );
  }

  // Calculate statistics
  const stats = {
    totalTasks: memberTasks.length,
    completedTasks: memberTasks.filter((t: any) => t.status === 'done').length,
    inProgressTasks: memberTasks.filter((t: any) => t.status === 'in_progress').length,
    totalHours: memberTasks.reduce((sum: number, t: any) => sum + (t.totalWorkedSeconds || 0), 0) / 3600,
    activeProjects: [...new Set(memberTasks.map((t: any) => t.projectId))].length,
  };

  const completionRate = stats.totalTasks > 0 
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100) 
    : 0;

  // Mock additional data
  const mockProfile = {
    avatar: `https://i.pravatar.cc/300?u=${id}`,
    title: member.role === 'admin' ? 'Senior Developer' : member.role === 'manager' ? 'Project Manager' : 'Frontend Developer',
    department: 'Engineering',
    location: 'San Francisco, CA',
    timezone: 'PST (UTC-8)',
    phoneNumber: '+1 (555) 123-4567',
    joinDate: '2023-01-15',
    employeeId: `EMP-${String(id).padStart(4, '0')}`,
    githubUsername: `${member.firstName.toLowerCase()}${member.lastName.toLowerCase()}`,
    linkedinUrl: '#',
    twitterUrl: '#',
  };

  const skills = [
    { name: 'React', level: 95 },
    { name: 'TypeScript', level: 90 },
    { name: 'Node.js', level: 85 },
    { name: 'UI/UX Design', level: 80 },
    { name: 'GraphQL', level: 75 },
    { name: 'AWS', level: 70 },
  ];

  const recentActivity = [
    {
      id: '1',
      type: 'task_completed',
      title: 'Completed task "Design homepage mockups"',
      timestamp: '2 hours ago',
      icon: CheckCircle,
      color: 'emerald',
    },
    {
      id: '2',
      type: 'task_started',
      title: 'Started working on "Implement navigation component"',
      timestamp: '4 hours ago',
      icon: Activity,
      color: 'blue',
    },
    {
      id: '3',
      type: 'comment',
      title: 'Added comment on "Setup deployment pipeline"',
      timestamp: '1 day ago',
      icon: MessageSquare,
      color: 'purple',
    },
    {
      id: '4',
      type: 'code_review',
      title: 'Reviewed pull request #234',
      timestamp: '2 days ago',
      icon: Code,
      color: 'indigo',
    },
    {
      id: '5',
      type: 'meeting',
      title: 'Attended sprint planning meeting',
      timestamp: '3 days ago',
      icon: Users,
      color: 'amber',
    },
  ];

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'tasks', label: 'Tasks & Projects' },
    { id: 'activity', label: 'Activity' },
    { id: 'performance', label: 'Performance' },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Back Button */}
      <button
        onClick={() => navigate('/team')}
        className="mb-6 flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-all"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Team
      </button>

      {/* Profile Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 mb-8 text-white shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          {/* Avatar */}
          <div className="relative">
            <img
              src={mockProfile.avatar}
              alt={`${member.firstName} ${member.lastName}`}
              className="w-32 h-32 rounded-2xl border-4 border-white/30 shadow-2xl"
            />
            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-emerald-500 rounded-xl border-4 border-white/30 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
              <div>
                <h1 className="text-3xl font-bold mb-2">
                  {member.firstName} {member.lastName}
                </h1>
                <p className="text-lg text-indigo-100 mb-3">{mockProfile.title}</p>
                <div className="flex flex-wrap items-center gap-4 text-sm text-indigo-100">
                  <span className="flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4" />
                    {mockProfile.department}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    {mockProfile.location}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    {mockProfile.timezone}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button className="px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-sm font-semibold transition-all flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Message
                </button>
                <button className="px-4 py-2 rounded-lg bg-white hover:bg-white/90 text-indigo-600 text-sm font-semibold transition-all flex items-center gap-2">
                  <Edit3 className="w-4 h-4" />
                  Edit Profile
                </button>
                <button className="p-2 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 transition-all">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { label: 'Tasks', value: stats.totalTasks, icon: Target },
                { label: 'Completed', value: stats.completedTasks, icon: CheckCircle },
                { label: 'In Progress', value: stats.inProgressTasks, icon: Activity },
                { label: 'Hours Logged', value: Math.round(stats.totalHours), icon: Clock },
                { label: 'Projects', value: stats.activeProjects, icon: Briefcase },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-4 h-4 text-indigo-200" />
                      <p className="text-xs text-indigo-200">{stat.label}</p>
                    </div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-8 border-b-2 border-slate-200">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Performance Overview */}
            <div className="bg-white rounded-2xl border-2 border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                Performance Overview
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Completion Rate */}
                <div className="text-center">
                  <div className="relative w-32 h-32 mx-auto mb-4">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="#e2e8f0"
                        strokeWidth="12"
                        fill="none"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="url(#gradient)"
                        strokeWidth="12"
                        fill="none"
                        strokeDasharray={`${(completionRate / 100) * 351.86} 351.86`}
                        strokeLinecap="round"
                      />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#6366f1" />
                          <stop offset="100%" stopColor="#a855f7" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-slate-900">{completionRate}%</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">Completion Rate</p>
                  <p className="text-xs text-slate-500 mt-1">This month</p>
                </div>

                {/* Productivity Score */}
                <div className="text-center">
                  <div className="w-32 h-32 mx-auto mb-4 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <div className="text-center">
                      <p className="text-4xl font-bold text-white">A+</p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">Productivity Score</p>
                  <p className="text-xs text-emerald-600 mt-1 flex items-center justify-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    +12% from last month
                  </p>
                </div>

                {/* Quality Rating */}
                <div className="text-center">
                  <div className="w-32 h-32 mx-auto mb-4 flex items-center justify-center">
                    <div className="relative">
                      <Star className="w-24 h-24 text-amber-400 fill-amber-400" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <p className="text-2xl font-bold text-amber-900 mt-2">4.9</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">Quality Rating</p>
                  <p className="text-xs text-slate-500 mt-1">Based on reviews</p>
                </div>
              </div>
            </div>

            {/* Skills */}
            <div className="bg-white rounded-2xl border-2 border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Zap className="w-5 h-5 text-indigo-600" />
                Skills & Expertise
              </h3>

              <div className="space-y-4">
                {skills.map((skill) => (
                  <div key={skill.name}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-slate-900">{skill.name}</p>
                      <p className="text-sm font-bold text-indigo-600">{skill.level}%</p>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full transition-all duration-500"
                        style={{ width: `${skill.level}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-2xl border-2 border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-600" />
                Recent Activity
              </h3>

              <div className="space-y-4">
                {recentActivity.map((activity, index) => {
                  const Icon = activity.icon;
                  return (
                    <div key={activity.id} className="flex items-start gap-4">
                      <div className="relative">
                        <div className={`w-10 h-10 rounded-xl bg-${activity.color}-100 flex items-center justify-center shrink-0`}>
                          <Icon className={`w-5 h-5 text-${activity.color}-600`} />
                        </div>
                        {index < recentActivity.length - 1 && (
                          <div className="absolute top-10 left-5 w-0.5 h-8 bg-slate-200" />
                        )}
                      </div>
                      <div className="flex-1 pt-1">
                        <p className="text-sm font-medium text-slate-900 mb-1">{activity.title}</p>
                        <p className="text-xs text-slate-500">{activity.timestamp}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Contact Information */}
            <div className="bg-white rounded-2xl border-2 border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-600" />
                Contact Information
              </h3>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Email</p>
                    <p className="text-sm font-medium text-slate-900">{member.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Phone</p>
                    <p className="text-sm font-medium text-slate-900">{mockProfile.phoneNumber}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Location</p>
                    <p className="text-sm font-medium text-slate-900">{mockProfile.location}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <Calendar className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Join Date</p>
                    <p className="text-sm font-medium text-slate-900">
                      {new Date(mockProfile.joinDate).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Social Links */}
            <div className="bg-white rounded-2xl border-2 border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Social Profiles</h3>

              <div className="space-y-3">
                <a
                  href={`https://github.com/${mockProfile.githubUsername}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl border-2 border-slate-200 hover:border-slate-900 hover:bg-slate-50 transition-all"
                >
                  <Github className="w-5 h-5 text-slate-900" />
                  <span className="text-sm font-medium text-slate-900">@{mockProfile.githubUsername}</span>
                </a>

                <a
                  href={mockProfile.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl border-2 border-slate-200 hover:border-blue-600 hover:bg-blue-50 transition-all"
                >
                  <Linkedin className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-slate-900">LinkedIn Profile</span>
                </a>

                <a
                  href={mockProfile.twitterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl border-2 border-slate-200 hover:border-sky-600 hover:bg-sky-50 transition-all"
                >
                  <Twitter className="w-5 h-5 text-sky-600" />
                  <span className="text-sm font-medium text-slate-900">Twitter Profile</span>
                </a>
              </div>
            </div>

            {/* Achievements */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border-2 border-amber-200 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-600" />
                Achievements
              </h3>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: '🏆', label: 'Top Performer', color: 'amber' },
                  { icon: '⚡', label: 'Fast Finisher', color: 'blue' },
                  { icon: '🎯', label: '100% On Time', color: 'emerald' },
                  { icon: '🌟', label: 'Quality Star', color: 'purple' },
                ].map((achievement) => (
                  <div
                    key={achievement.label}
                    className={`bg-white rounded-xl p-3 border-2 border-${achievement.color}-200 text-center`}
                  >
                    <p className="text-2xl mb-1">{achievement.icon}</p>
                    <p className="text-xs font-semibold text-slate-700">{achievement.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tasks & Projects Tab */}
      {activeTab === 'tasks' && (
        <div className="space-y-6">
          {/* Current Tasks */}
          <div className="bg-white rounded-2xl border-2 border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-600" />
              Current Tasks ({memberTasks.length})
            </h3>

            <div className="space-y-3">
              {memberTasks.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">No tasks assigned</p>
              ) : (
                memberTasks.map((task: any) => {
                  const project = allProjects.find((p: any) => p._id === task.projectId);
                  const statusColors = {
                    todo: 'slate',
                    in_progress: 'blue',
                    done: 'emerald',
                    under_verification: 'purple',
                    clarification: 'amber',
                  };
                  const statusColor = statusColors[task.status as keyof typeof statusColors] || 'slate';

                  return (
                    <div
                      key={task._id}
                      className="p-4 rounded-xl border-2 border-slate-200 hover:border-indigo-300 transition-all cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-slate-900 mb-1">{task.title}</p>
                          <p className="text-xs text-slate-500">{project?.name}</p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-lg bg-${statusColor}-100 border border-${statusColor}-200 text-xs font-bold text-${statusColor}-700 whitespace-nowrap`}
                        >
                          {task.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Due: {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                        {task.totalWorkedSeconds > 0 && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {Math.round(task.totalWorkedSeconds / 3600)}h logged
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Projects */}
          <div className="bg-white rounded-2xl border-2 border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-indigo-600" />
              Active Projects ({stats.activeProjects})
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...new Set(memberTasks.map((t: any) => t.projectId))].map((projectId: any) => {
                const project = allProjects.find((p: any) => p._id === projectId);
                const projectTasks = memberTasks.filter((t: any) => t.projectId === projectId);
                const completedProjectTasks = projectTasks.filter((t: any) => t.status === 'done').length;
                const projectProgress = Math.round((completedProjectTasks / projectTasks.length) * 100);

                return (
                  <div
                    key={projectId}
                    className="p-5 rounded-xl border-2 border-slate-200 hover:border-indigo-300 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                        <Briefcase className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-900">{project?.name}</p>
                        <p className="text-xs text-slate-500">{projectTasks.length} tasks assigned</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600">Progress</span>
                        <span className="font-bold text-indigo-600">{projectProgress}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full"
                          style={{ width: `${projectProgress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Activity Tab */}
      {activeTab === 'activity' && (
        <div className="bg-white rounded-2xl border-2 border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-600" />
            Activity Timeline
          </h3>

          <div className="space-y-6">
            {recentActivity.map((activity, index) => {
              const Icon = activity.icon;
              return (
                <div key={activity.id} className="flex items-start gap-4">
                  <div className="relative">
                    <div className={`w-12 h-12 rounded-xl bg-${activity.color}-100 flex items-center justify-center shrink-0`}>
                      <Icon className={`w-6 h-6 text-${activity.color}-600`} />
                    </div>
                    {index < recentActivity.length - 1 && (
                      <div className="absolute top-12 left-6 w-0.5 h-12 bg-slate-200" />
                    )}
                  </div>
                  <div className="flex-1 pt-2">
                    <p className="text-sm font-semibold text-slate-900 mb-1">{activity.title}</p>
                    <p className="text-xs text-slate-500 mb-3">{activity.timestamp}</p>
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <p className="text-sm text-slate-600">
                        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Performance Tab */}
      {activeTab === 'performance' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weekly Performance */}
          <div className="bg-white rounded-2xl border-2 border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              Weekly Performance
            </h3>

            <div className="space-y-4">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day, index) => {
                const hours = [8, 7.5, 9, 8.5, 7][index];
                const percentage = (hours / 9) * 100;
                return (
                  <div key={day}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-slate-900">{day}</p>
                      <p className="text-sm font-bold text-indigo-600">{hours}h</p>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Task Distribution */}
          <div className="bg-white rounded-2xl border-2 border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-600" />
              Task Distribution
            </h3>

            <div className="space-y-6">
              {[
                { label: 'Completed', value: stats.completedTasks, total: stats.totalTasks, color: 'emerald' },
                { label: 'In Progress', value: stats.inProgressTasks, total: stats.totalTasks, color: 'blue' },
                { label: 'Pending', value: stats.totalTasks - stats.completedTasks - stats.inProgressTasks, total: stats.totalTasks, color: 'slate' },
              ].map((item) => {
                const percentage = stats.totalTasks > 0 ? Math.round((item.value / item.total) * 100) : 0;
                return (
                  <div key={item.label}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-600">{item.value}</p>
                        <p className={`text-sm font-bold text-${item.color}-600`}>{percentage}%</p>
                      </div>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-${item.color}-500 rounded-full`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Monthly Stats */}
          <div className="lg:col-span-2 bg-white rounded-2xl border-2 border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              Monthly Statistics
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { label: 'Tasks Completed', value: 24, trend: '+12%', icon: CheckCircle, color: 'emerald', trendUp: true },
                { label: 'Avg. Completion Time', value: '3.2h', trend: '-8%', icon: Clock, color: 'blue', trendUp: true },
                { label: 'Quality Score', value: '98%', trend: '+5%', icon: Star, color: 'amber', trendUp: true },
                { label: 'Code Reviews', value: 18, trend: '+3', icon: Code, color: 'purple', trendUp: true },
              ].map((stat) => {
                const Icon = stat.icon;
                const TrendIcon = stat.trendUp ? TrendingUp : TrendingDown;
                return (
                  <div key={stat.label} className={`p-5 rounded-xl bg-${stat.color}-50 border-2 border-${stat.color}-200`}>
                    <div className="flex items-center justify-between mb-3">
                      <Icon className={`w-8 h-8 text-${stat.color}-600`} />
                      <span className={`flex items-center gap-1 text-xs font-bold ${stat.trendUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                        <TrendIcon className="w-3 h-3" />
                        {stat.trend}
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 mb-1">{stat.value}</p>
                    <p className="text-xs font-medium text-slate-600">{stat.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
