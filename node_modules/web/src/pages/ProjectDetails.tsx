import React from 'react';
import { useParams, Link, Routes, Route, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getProject } from '../services/core';
import ProjectBoard from './ProjectBoard';
import Sprints from './Sprints';

const ProjectOverview = ({ project }: { project: any }) => (
    <div className="bg-white p-6 rounded shadow">
        <h2 className="text-xl font-bold mb-4">Overview</h2>
        <p>{project.description || 'No description provided.'}</p>
        <div className="mt-4">
            <h3 className="font-semibold">Status</h3>
            <p className="capitalize">{project.status}</p>
        </div>
    </div>
);

const ProjectDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { data: project, isLoading } = useQuery({
        queryKey: ['project', id],
        queryFn: () => getProject(id!)
    });
    const location = useLocation();

    if (isLoading) return <div>Loading...</div>;
    if (!project) return <div>Project not found</div>;

    const tabs = [
        { name: 'Overview', path: '' },
        { name: 'Board', path: 'board' },
        { name: 'Backlog', path: 'backlog' },
        { name: 'Sprints', path: 'sprints' },
        { name: 'Settings', path: 'settings' },
    ];

    return (
        <div className="p-6 h-full flex flex-col">
            <div className="mb-6">
                <Link to="/projects" className="text-indigo-600 hover:underline mb-2 block">&larr; Back to Projects</Link>
                <h1 className="text-3xl font-bold">{project.name}</h1>
            </div>

            <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8">
                    {tabs.map((tab) => {
                        const isCurrent = location.pathname.endsWith(tab.path ? `/${tab.path}` : `/${id}`) || (tab.path === '' && location.pathname === `/projects/${id}`);
                        return (
                            <Link
                                key={tab.name}
                                to={tab.path}
                                className={`${isCurrent
                                        ? 'border-indigo-500 text-indigo-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                            >
                                {tab.name}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            <div className="flex-1 overflow-auto">
                <Routes>
                    <Route path="/" element={<ProjectOverview project={project} />} />
                    <Route path="/board" element={<ProjectBoard />} />
                    <Route path="/sprints" element={<Sprints />} />
                    <Route path="*" element={<div>Module coming soon...</div>} />
                </Routes>
            </div>
        </div>
    );
};

export default ProjectDetails;
