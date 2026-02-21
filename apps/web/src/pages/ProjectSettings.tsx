import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateProject } from '../services/core';
import Switch from '../components/Switch';
import {
    Shield,
    Globe,
    Lock,
    Trash2,
    Users,
    Settings as SettingsIcon,
    Save
} from 'lucide-react';

const ProjectSettings: React.FC<{ project: any }> = ({ project }) => {
    const queryClient = useQueryClient();
    const [saved, setSaved] = useState(false);
    const [visibility, setVisibility] = useState(project.visibility);

    const updateMutation = useMutation({
        mutationFn: (data: any) => updateProject(project._id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['project', project._id] });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        },
    });

    const handleVisibilityChange = (checked: boolean) => {
        const newVisibility = checked ? 'public' : 'private';
        setVisibility(newVisibility);
        updateMutation.mutate({ visibility: newVisibility });
    };

    return (
        <div className="max-w-4xl mx-auto p-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Project Settings</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage project preferences and visibility</p>
                </div>
                {saved && (
                    <div className="flex items-center text-green-600 bg-green-50 px-3 py-1.5 rounded-full text-sm font-medium animate-in fade-in slide-in-from-right-4">
                        <Save className="w-4 h-4 mr-1.5" />
                        Settings saved
                    </div>
                )}
            </div>

            <div className="space-y-6">
                {/* General Section */}
                <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/50 flex items-center">
                        <SettingsIcon className="w-4 h-4 text-gray-500 mr-2" />
                        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">General</h2>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                                    {visibility === 'public' ? <Globe className="w-4 h-4 mr-2 text-indigo-500" /> : <Lock className="w-4 h-4 mr-2 text-amber-500" />}
                                    Project Visibility
                                </h3>
                                <p className="text-xs text-gray-500">
                                    {visibility === 'public'
                                        ? 'Anyone in the organization can view this project and its tasks.'
                                        : 'Only explicit members and admins can view this project.'}
                                </p>
                            </div>
                            <Switch
                                checked={visibility === 'public'}
                                onChange={handleVisibilityChange}
                                label={visibility === 'public' ? 'Public' : 'Private'}
                            />
                        </div>
                    </div>
                </div>

                {/* Team Section */}
                <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/50 flex items-center">
                        <Users className="w-4 h-4 text-gray-500 mr-2" />
                        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Members & Permissions</h2>
                    </div>
                    <div className="p-6">
                        <div className="flex items-center justify-between p-4 bg-indigo-50 border border-indigo-100 rounded-lg">
                            <div className="flex items-center">
                                <Shield className="w-5 h-5 text-indigo-600 mr-3" />
                                <div>
                                    <p className="text-sm font-medium text-indigo-900">Admin Oversight</p>
                                    <p className="text-xs text-indigo-700 mt-0.5">Administrators have full access to this project regardless of visibility settings.</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8">
                            <h3 className="text-sm font-semibold text-gray-900 mb-4">Project Members</h3>
                            <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-xl">
                                <Users className="w-8 h-8 text-gray-200 mx-auto mb-3" />
                                <p className="text-sm text-gray-400">Collaborator management coming soon</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Danger Zone */}
                <div className="bg-red-50/30 border border-red-100 rounded-xl shadow-sm overflow-hidden mt-12">
                    <div className="px-6 py-4 border-b border-red-100 bg-red-50/50 flex items-center">
                        <AlertCircle className="w-4 h-4 text-red-600 mr-2" />
                        <h2 className="text-sm font-semibold text-red-700 uppercase tracking-wider">Danger Zone</h2>
                    </div>
                    <div className="p-6 flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-semibold text-gray-900">Delete this project</h3>
                            <p className="text-xs text-gray-500 mt-1">Once you delete a project, there is no going back. Please be certain.</p>
                        </div>
                        <button className="bg-white border border-red-200 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Project
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectSettings;

const AlertCircle = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
);
