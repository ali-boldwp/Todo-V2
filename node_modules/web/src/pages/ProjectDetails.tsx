import React, { useState, useCallback } from 'react';
import { useParams, Routes, Route } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProject, updateProject } from '../services/core';
import ProjectTasks from './ProjectTasks';
import ProjectSettings from './ProjectSettings';
import Sprints from './Sprints';
import RichTextEditor from '../components/RichTextEditor';

// ─── Project Overview ────────────────────────────────────────────────────────

const ProjectOverview = ({ project }: { project: any }) => {
    const queryClient = useQueryClient();
    const [saved, setSaved] = useState(false);

    const updateMutation = useMutation({
        mutationFn: (description: any) => updateProject(project._id, { description }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['project', project._id] });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        },
    });

    const handleChange = useCallback(
        (data: any) => { updateMutation.mutate(data); },
        [project._id]
    );

    const initialData =
        project.description && typeof project.description === 'object'
            ? project.description
            : undefined;

    return (
        <div className="relative h-full">
            {/* Auto-save badge */}
            {saved && (
                <span className="absolute top-3 right-4 text-xs text-green-600 font-medium bg-green-50 px-2.5 py-1 rounded-full z-10">
                    ✓ Saved
                </span>
            )}
            <RichTextEditor
                holder={`overview-editor-${project._id}`}
                data={initialData}
                onChange={handleChange}
            />
        </div>
    );
};

// ─── Project Details Shell ────────────────────────────────────────────────────

const ProjectDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { data: project, isLoading } = useQuery({
        queryKey: ['project', id],
        queryFn: () => getProject(id!),
    });

    if (isLoading) return <div>Loading...</div>;
    if (!project) return <div>Project not found</div>;

    return (
        <div className="h-full overflow-auto">
            <Routes>
                <Route path="/" element={<ProjectOverview project={project} />} />
                <Route path="/overview" element={<ProjectOverview project={project} />} />
                <Route path="/tasks" element={<ProjectTasks />} />
                <Route path="/sprints" element={<Sprints />} />
                <Route path="/settings" element={<ProjectSettings project={project} />} />
                <Route path="*" element={<div className="text-gray-400 text-sm">Module coming soon...</div>} />
            </Routes>
        </div>
    );
};

export default ProjectDetails;
