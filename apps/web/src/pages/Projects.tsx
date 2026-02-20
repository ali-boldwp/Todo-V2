import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProjects, createProject, updateProject } from '../services/core';
import { ProjectInput } from '@devmanager/shared/dist/index';
import { Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ProjectSchema } from '@devmanager/shared/dist/index';

import RichTextEditor from '../components/RichTextEditor';
import Drawer from '../components/Drawer';
import Switch from '../components/Switch';

// Helper to check if description is JSON (EditorJS output)
const renderDescription = (desc: any) => {
    if (typeof desc === 'string') return desc;
    if (desc && desc.blocks) {
        return desc.blocks.map((block: any) => block.data.text).join(' ').substring(0, 100) + '...';
    }
    return '';
};

const Projects: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const { data: projects, isLoading } = useQuery({ queryKey: ['projects'], queryFn: getProjects });
    const queryClient = useQueryClient();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    // Check for create action
    React.useEffect(() => {
        if (searchParams.get('action') === 'create') {
            setIsDrawerOpen(true);
            setSearchParams(prev => {
                const newParams = new URLSearchParams(prev);
                newParams.delete('action');
                return newParams;
            });
        }
    }, [searchParams, setSearchParams]);
    const [editorData, setEditorData] = useState<any>(null);
    const [visibility, setVisibility] = useState<'public' | 'private'>('private');
    const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

    const { register, handleSubmit, reset, formState: { errors } } = useForm<ProjectInput>({
        resolver: zodResolver(ProjectSchema),
        defaultValues: {
            status: 'draft',
            priority: 'medium',
            visibility: 'private'
        }
    });

    const createMutation = useMutation({
        mutationFn: createProject,
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            setCurrentProjectId(data._id);
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string, data: Partial<ProjectInput> }) => updateProject(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
        },
    });

    // Auto-create on name blur
    const handleNameBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
        const name = e.target.value;
        if (name && !currentProjectId) {
            createMutation.mutate({
                name,
                status: 'draft',
                visibility: 'private',
                priority: 'medium'
            });
        }
    };

    const handleSave = (data: ProjectInput) => {
        if (currentProjectId) {
            updateMutation.mutate({
                id: currentProjectId,
                data: {
                    ...data,
                    description: editorData,
                    visibility,
                }
            });
            setIsDrawerOpen(false);
            resetForm();
        }
    };

    const resetForm = () => {
        reset();
        setEditorData(null);
        setVisibility('private');
        setCurrentProjectId(null);
    };

    const handleDrawerClose = () => {
        setIsDrawerOpen(false);
        resetForm();
    };

    if (isLoading) return <div>Loading...</div>;

    return (
        <div className="p-8 max-w-[1600px] mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center space-x-3">
                    <h1 className="text-xl font-semibold text-gray-900">Projects</h1>
                    <span className="text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{projects?.length || 0}</span>
                </div>
                <button
                    onClick={() => setIsDrawerOpen(true)}
                    className="bg-gray-900 hover:bg-gray-800 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors shadow-sm flex items-center"
                >
                    <span className="mr-1.5">+</span> New Project
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {projects?.map((project: any) => (
                    <Link to={`/projects/${project._id}`} key={project._id} className="block group">
                        <div className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-sm transition-all h-full flex flex-col relative">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center space-x-2">
                                    <div className={`w-2 h-2 rounded-full ${project.status === 'active' ? 'bg-yellow-400' :
                                        project.status === 'completed' ? 'bg-green-500' :
                                            project.status === 'draft' ? 'bg-gray-300' : 'bg-blue-400'
                                        }`} />
                                    <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                                        {project.status || 'active'}
                                    </span>
                                </div>
                                <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${project.priority === 'high' ? 'bg-red-50 text-red-600' :
                                    project.priority === 'low' ? 'bg-blue-50 text-blue-600' :
                                        'bg-gray-50 text-gray-600'
                                    }`}>
                                    {project.priority || 'MED'}
                                </span>
                            </div>

                            <h3 className="text-sm font-semibold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors">
                                {project.name}
                            </h3>

                            <p className="text-xs text-gray-500 line-clamp-2 mb-4 flex-1">
                                {renderDescription(project.description) || "No description"}
                            </p>

                            <div className="flex items-center justify-between pt-3 border-t border-gray-50 mt-auto">
                                <div className="flex items-center -space-x-1.5">
                                    {/* Mock Avatars */}
                                    <div className="w-5 h-5 rounded-full bg-red-100 border border-white flex items-center justify-center text-[8px] text-red-700 font-bold">JD</div>
                                    <div className="w-5 h-5 rounded-full bg-blue-100 border border-white flex items-center justify-center text-[8px] text-blue-700 font-bold">AS</div>
                                </div>
                                {project.endDate && (
                                    <span className="text-[10px] text-gray-400">
                                        {new Date(project.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    </span>
                                )}
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            <Drawer
                isOpen={isDrawerOpen}
                onClose={handleDrawerClose}
                title="Create New Project"
            >
                <form className="space-y-8">
                    {/* Project Name & Description */}
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Project Name</label>
                            <input
                                {...register('name')}
                                onBlur={handleNameBlur}
                                className="w-full bg-gray-50 border-gray-100 rounded-xl px-4 py-3 text-lg font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none placeholder:text-gray-400"
                                placeholder="e.g. Website Redesign"
                            />
                            {errors.name && <p className="text-red-500 text-xs mt-1 ml-1">{errors.name.message}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                            <div className="bg-gray-50 border border-gray-100 rounded-xl p-1 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 focus-within:bg-white transition-all min-h-[150px]">
                                <RichTextEditor
                                    onChange={(data) => setEditorData(data)}
                                    data={editorData}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-gray-100" />

                    {/* Meta Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Target Date</label>
                            <input
                                type="date"
                                {...register('endDate')}
                                className="w-full bg-gray-50 border-gray-100 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Priority</label>
                            <div className="relative">
                                <select
                                    {...register('priority')}
                                    className="w-full bg-gray-50 border-gray-100 rounded-lg px-3 py-2.5 text-sm appearance-none focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
                                >
                                    <option value="low">Low Priority</option>
                                    <option value="medium">Medium Priority</option>
                                    <option value="high">High Priority</option>
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                    ▼
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Settings */}
                    <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-sm font-semibold text-gray-900">Visibility</span>
                                <span className="text-xs text-gray-500">Who can see this project?</span>
                            </div>
                            <Switch
                                checked={visibility === 'public'}
                                onChange={(checked) => setVisibility(checked ? 'public' : 'private')}
                                label={visibility === 'public' ? 'Public' : 'Private'}
                            />
                        </div>

                        <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                            <div className="flex flex-col">
                                <span className="text-sm font-semibold text-gray-900">Initial Status</span>
                                <span className="text-xs text-gray-500">Start as draft or active?</span>
                            </div>
                            <select
                                {...register('status')}
                                className="bg-white border text-sm border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="draft">Draft</option>
                                <option value="active">Active</option>
                            </select>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end pt-6 gap-3">
                        <button
                            type="button"
                            onClick={handleDrawerClose}
                            className="px-6 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit(handleSave)}
                            className="px-6 py-2.5 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 transition-all shadow-lg shadow-gray-900/20 active:scale-95"
                        >
                            Create Project
                        </button>
                    </div>
                </form>
            </Drawer>
        </div>
    );
};

export default Projects;
