import api from './api';

export const getTeamMembers = async () => {
    const res = await api.get('/auth/team-members');
    return res.data;
};

export const createTeamMember = async (data: {
    firstName: string;
    lastName: string;
    email: string;
    githubUsername?: string;
    canVerifyTasks?: boolean;
    password: string;
    role: 'manager' | 'member';
}) => {
    const res = await api.post('/auth/team-members', data);
    return res.data;
};

export const updateTeamMember = async (id: string, data: { role?: string; isActive?: boolean; githubUsername?: string; canVerifyTasks?: boolean }) => {
    const res = await api.patch(`/auth/team-members/${id}`, data);
    return res.data;
};

export const deleteTeamMember = async (id: string) => {
    const res = await api.delete(`/auth/team-members/${id}`);
    return res.data;
};

export const resetTeamMemberPassword = async (id: string) => {
    const res = await api.post(`/auth/team-members/${id}/reset-password`);
    return res.data;
};

export const addProjectMember = async (projectId: string, userId: string) => {
    const res = await api.post(`/projects/${projectId}/members`, { userId });
    return res.data;
};

export const removeProjectMember = async (projectId: string, userId: string) => {
    const res = await api.delete(`/projects/${projectId}/members/${userId}`);
    return res.data;
};
