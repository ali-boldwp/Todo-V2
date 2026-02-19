import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProjects, createProject, updateProject } from '../services/core';
import { ProjectInput } from '@devmanager/shared/dist/index';
import { Link } from 'react-router-dom';
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
    const { data: projects, isLoading } = useQuery({ queryKey: ['projects'], queryFn: getProjects });
    const queryClient = useQueryClient();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
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
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Projects</h1>
                <button
                    onClick={() => setIsDrawerOpen(true)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
                >
                    New Project
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects?.map((project: any) => (
                    <Link to={`/projects/${project._id}`} key={project._id} className="block">
                        <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="text-xl font-semibold">{project.name}</h3>
                                <span className={`px-2 py-0.5 rounded text-xs ${project.priority === 'high' ? 'bg-red-100 text-red-800' : project.priority === 'low' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                                    {project.priority || 'medium'}
                                </span>
                            </div>
                            <p className="text-gray-600 mb-4">{renderDescription(project.description)}</p>
                            <div className="flex gap-2">
                                <span className={`px-2 py-1 rounded text-sm ${project.status === 'active' ? 'bg-green-100 text-green-800' : project.status === 'draft' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                                    {project.status || 'active'}
                                </span>
                                {project.visibility && (
                                    <span className={`px-2 py-1 rounded text-sm ${project.visibility === 'public' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                                        {project.visibility}
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
                title="Create Project"
            >
                <form className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Name</label>
                        <input
                            {...register('name')}
                            onBlur={handleNameBlur}
                            className="mt-1 block w-full border rounded p-2"
                            placeholder="Enter project name to start..."
                        />
                        {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Deadline</label>
                            <input
                                type="date"
                                {...register('endDate')}
                                className="mt-1 block w-full border rounded p-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Priority</label>
                            <select
                                {...register('priority')}
                                className="mt-1 block w-full border rounded p-2"
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                        <div className="border border-gray-300 rounded-lg p-2 min-h-[200px]">
                            <RichTextEditor
                                onChange={(data) => setEditorData(data)}
                                data={editorData}
                            />
                        </div>
                    </div>

                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <Switch
                                checked={visibility === 'public'}
                                onChange={(checked) => setVisibility(checked ? 'public' : 'private')}
                                label={visibility === 'public' ? 'Public' : 'Private'}
                            />
                        </div>

                        <div className="w-1/3">
                            <label className="block text-sm font-medium text-gray-700">Status</label>
                            <select
                                {...register('status')}
                                className="mt-1 block w-full border rounded p-2"
                            >
                                <option value="draft">Draft</option>
                                <option value="active">Active</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end space-x-2 pt-4 border-t mt-8">
                        <button
                            type="button"
                            onClick={handleDrawerClose}
                            className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit(handleSave)}
                            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                        >
                            Save Project
                        </button>
                    </div>
                </form>
            </Drawer>
        </div>
    );
};

export default Projects;
