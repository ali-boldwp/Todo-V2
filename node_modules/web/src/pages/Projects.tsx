import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProjects, createProject } from '../services/core';
import { ProjectInput } from '@devmanager/shared/dist/index';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ProjectSchema } from '@devmanager/shared/dist/index';

import RichTextEditor from '../components/RichTextEditor';

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
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editorData, setEditorData] = useState<any>(null);
    const [visibility, setVisibility] = useState<'public' | 'private'>('private');

    const { register, handleSubmit, reset, formState: { errors } } = useForm<ProjectInput>({
        resolver: zodResolver(ProjectSchema),
    });

    const mutation = useMutation({
        mutationFn: createProject,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            setIsModalOpen(false);
            reset();
            setEditorData(null);
            setVisibility('private');
        },
    });



    const handleSaveAsDraft = (data: ProjectInput) => {
        mutation.mutate({
            ...data,
            description: editorData,
            visibility,
            status: 'draft'
        });
    };

    const handlePublish = (data: ProjectInput) => {
        mutation.mutate({
            ...data,
            description: editorData,
            visibility,
            status: 'active'
        });
    };

    if (isLoading) return <div>Loading...</div>;

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Projects</h1>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
                >
                    New Project
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects?.map((project: any) => (
                    <Link to={`/projects/${project._id}`} key={project._id} className="block">
                        <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
                            <h3 className="text-xl font-semibold mb-2">{project.name}</h3>
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

            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">Create Project</h2>
                        <form className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Name</label>
                                <input {...register('name')} className="mt-1 block w-full border rounded p-2" />
                                {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
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

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Visibility</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            value="private"
                                            checked={visibility === 'private'}
                                            onChange={() => setVisibility('private')}
                                            className="mr-2"
                                        />
                                        Private
                                    </label>
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            value="public"
                                            checked={visibility === 'public'}
                                            onChange={() => setVisibility('public')}
                                            className="mr-2"
                                        />
                                        Public
                                    </label>
                                </div>
                            </div>

                            <div className="flex justify-end space-x-2 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSubmit(handleSaveAsDraft)}
                                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                                >
                                    Save as Draft
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSubmit(handlePublish)}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                                >
                                    Publish
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Projects;
