import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { updateProject, getClients, deleteProject } from '../services/core';
import { addProjectMember, removeProjectMember, getTeamMembers } from '../services/team';
import { useAuth } from '../context/AuthContext';
import Switch from '../components/Switch';
import { useNavigate } from 'react-router-dom';
import {
    Shield, Globe, Lock, Trash2, Users, Settings as SettingsIcon, Save, UserPlus, X, Briefcase,
} from 'lucide-react';

const avatarColor = (id: string) => {
    const colors = ['bg-indigo-500', 'bg-violet-500', 'bg-sky-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500'];
    return colors[id.charCodeAt(id.length - 1) % colors.length];
};

const AlertCircle = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
);

const ProjectSettings: React.FC<{ project: any }> = ({ project }) => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [saved, setSaved] = useState(false);
    const [visibility, setVisibility] = useState(project.visibility);
    const [showAddMember, setShowAddMember] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [selectedClientId, setSelectedClientId] = useState(
        project.clientId ? (typeof project.clientId === 'object' ? project.clientId._id : project.clientId) : ''
    );

    const updateMutation = useMutation({
        mutationFn: (data: any) => updateProject(project._id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['project', project._id] });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        },
    });

    const addMemberMutation = useMutation({
        mutationFn: (userId: string) => addProjectMember(project._id, userId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['project', project._id] });
            setShowAddMember(false);
            setSelectedUserId('');
        },
    });

    const removeMemberMutation = useMutation({
        mutationFn: (userId: string) => removeProjectMember(project._id, userId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project', project._id] }),
    });

    const { data: allTeamMembers = [] } = useQuery({
        queryKey: ['team-members'],
        queryFn: getTeamMembers,
    });

    const { data: allClients = [] } = useQuery({
        queryKey: ['clients'],
        queryFn: getClients,
        enabled: user?.role === 'admin',
    });

    const clientMutation = useMutation({
        mutationFn: (clientId: string | null) => updateProject(project._id, { clientId } as any),
        onSuccess: (updated) => {
            queryClient.invalidateQueries({ queryKey: ['project', project._id] });
            const newId = updated.clientId ? (typeof updated.clientId === 'object' ? updated.clientId._id : updated.clientId) : '';
            setSelectedClientId(newId);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        },
    });

    const deleteProjectMutation = useMutation({
        mutationFn: () => deleteProject(project._id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            navigate('/');
        }
    });

    const handleVisibilityChange = (checked: boolean) => {
        const newVisibility = checked ? 'public' : 'private';
        setVisibility(newVisibility);
        updateMutation.mutate({ visibility: newVisibility });
    };

    const currentMembers: any[] = project.members || [];
    const currentMemberIds = currentMembers.map((m: any) => (typeof m === 'string' ? m : m._id));
    const availableToAdd = allTeamMembers.filter(
        (m: any) => m.role !== 'admin' && !currentMemberIds.includes(m._id)
    );

    return (
        <div className="max-w-4xl mx-auto p-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Project Settings</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage project preferences and visibility</p>
                </div>
                {saved && (
                    <div className="flex items-center text-green-600 bg-green-50 px-3 py-1.5 rounded-full text-sm font-medium">
                        <Save className="w-4 h-4 mr-1.5" />
                        Settings saved
                    </div>
                )}
            </div>

            <div className="space-y-6">
                {/* General */}
                <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/50 flex items-center">
                        <SettingsIcon className="w-4 h-4 text-gray-500 mr-2" />
                        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">General</h2>
                    </div>
                    <div className="p-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                                    {visibility === 'public' ? <Globe className="w-4 h-4 mr-2 text-indigo-500" /> : <Lock className="w-4 h-4 mr-2 text-amber-500" />}
                                    Project Visibility
                                </h3>
                                <p className="text-xs text-gray-500">
                                    {visibility === 'public'
                                        ? 'Anyone in the organization can view this project.'
                                        : 'Only assigned members and admins can view this project.'}
                                </p>
                            </div>
                            <Switch checked={visibility === 'public'} onChange={handleVisibilityChange} label={visibility === 'public' ? 'Public' : 'Private'} />
                        </div>
                    </div>
                </div>

                {/* Client Access (admin only) */}
                {user?.role === 'admin' && (
                    <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/50 flex items-center">
                            <Briefcase className="w-4 h-4 text-gray-500 mr-2" />
                            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Client Access</h2>
                        </div>
                        <div className="p-6">
                            <p className="text-xs text-gray-500 mb-3">Share this project with a client so they can view its tasks.</p>
                            <div className="flex gap-2">
                                <select
                                    value={selectedClientId}
                                    onChange={(e) => setSelectedClientId(e.target.value)}
                                    className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="">— No client —</option>
                                    {allClients.map((c: any) => (
                                        <option key={c._id} value={c._id}>{c.name}</option>
                                    ))}
                                </select>
                                <button
                                    onClick={() => clientMutation.mutate(selectedClientId || null)}
                                    disabled={clientMutation.isPending}
                                    className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {selectedClientId ? 'Assign' : 'Remove'}
                                </button>
                            </div>
                            {selectedClientId && (
                                <p className="text-xs text-gray-400 mt-2">
                                    Client will see this project and its tasks when logged in.
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Members - Staff only */}
                {user?.role !== 'client' && (
                    <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
                            <div className="flex items-center">
                                <Users className="w-4 h-4 text-gray-500 mr-2" />
                                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Members</h2>
                            </div>
                            <button
                                onClick={() => setShowAddMember(true)}
                                className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-2.5 py-1.5 rounded-md transition-colors"
                            >
                                <UserPlus className="w-3.5 h-3.5" />
                                Add Member
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="flex items-center gap-2 p-3 bg-indigo-50 border border-indigo-100 rounded-lg mb-4">
                                <Shield className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                                <p className="text-xs text-indigo-800 font-medium">Admins always have full access to all projects</p>
                            </div>

                            {currentMembers.length === 0 ? (
                                <div className="text-center py-8 text-sm text-gray-400">
                                    No members assigned yet. Click "Add Member" above.
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {currentMembers.map((m: any) => {
                                        const id = typeof m === 'string' ? m : m._id;
                                        const name = typeof m === 'string' ? id : `${m.firstName} ${m.lastName}`;
                                        const email = typeof m === 'string' ? '' : m.email;
                                        const role = typeof m === 'string' ? '' : m.role;
                                        const ini = typeof m === 'string' ? '?' : `${m.firstName?.[0] ?? ''}${m.lastName?.[0] ?? ''}`.toUpperCase();
                                        return (
                                            <div key={id} className="flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded-lg group">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full ${avatarColor(id)} text-white text-xs font-bold flex items-center justify-center flex-shrink-0`}>
                                                        {ini}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">{name}</p>
                                                        {email && <p className="text-xs text-gray-400">{email}</p>}
                                                    </div>
                                                    {role && <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{role}</span>}
                                                </div>
                                                <button
                                                    onClick={() => removeMemberMutation.mutate(id)}
                                                    disabled={removeMemberMutation.isPending}
                                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500 transition-all"
                                                    title="Remove from project"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {showAddMember && (
                                <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                                    <h4 className="text-xs font-semibold text-gray-600 mb-2">Select team member to add</h4>
                                    {availableToAdd.length === 0 ? (
                                        <p className="text-sm text-gray-400">All team members are already assigned to this project.</p>
                                    ) : (
                                        <div className="flex gap-2">
                                            <select
                                                value={selectedUserId}
                                                onChange={(e) => setSelectedUserId(e.target.value)}
                                                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            >
                                                <option value="">— pick a member —</option>
                                                {availableToAdd.map((m: any) => (
                                                    <option key={m._id} value={m._id}>
                                                        {m.firstName} {m.lastName} ({m.role})
                                                    </option>
                                                ))}
                                            </select>
                                            <button
                                                onClick={() => selectedUserId && addMemberMutation.mutate(selectedUserId)}
                                                disabled={!selectedUserId || addMemberMutation.isPending}
                                                className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                                            >
                                                Add
                                            </button>
                                            <button
                                                onClick={() => { setShowAddMember(false); setSelectedUserId(''); }}
                                                className="px-3 py-2 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-white"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Danger Zone - Admin only */}
                {user?.role === 'admin' && (
                    <div className="bg-red-50/30 border border-red-100 rounded-xl shadow-sm overflow-hidden mt-12">
                        <div className="px-6 py-4 border-b border-red-100 bg-red-50/50 flex items-center">
                            <AlertCircle className="w-4 h-4 text-red-600 mr-2" />
                            <h2 className="text-sm font-semibold text-red-700 uppercase tracking-wider">Danger Zone</h2>
                        </div>
                        <div className="p-6 flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900">Delete this project</h3>
                                <p className="text-xs text-gray-500 mt-1">Once you delete a project, there is no going back.</p>
                            </div>
                            <button
                                onClick={() => {
                                    if (window.confirm(`Are you sure you want to delete ${project.name}? This action cannot be undone.`)) {
                                        deleteProjectMutation.mutate();
                                    }
                                }}
                                disabled={deleteProjectMutation.isPending}
                                className="bg-white border border-red-200 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-semibold flex items-center disabled:opacity-50"
                            >
                                {deleteProjectMutation.isPending ? 'Deleting...' : (
                                    <>
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Delete Project
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProjectSettings;
