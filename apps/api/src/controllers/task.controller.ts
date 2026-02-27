import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Task from '../models/Task';
import Project from '../models/Project';
import GithubConfig from '../models/GithubConfig';
import { TaskSchema } from '@devmanager/shared/dist/task.schema';
import { emitToAll, emitToProject } from '../socket';

const INTERNAL_ROLES = ['admin', 'manager', 'member'];

const isClarificationRequestPayload = (body: any) => {
    if (body?.status === 'clarified') return false;
    return (
        body?.status === 'clarification' ||
        body?.needsClarification === true ||
        (
            Object.prototype.hasOwnProperty.call(body || {}, 'clarificationText') &&
            !!body?.clarificationText
        )
    );
};

async function createGithubBranch(
    token: string,
    owner: string,
    repo: string,
    branchName: string
): Promise<string | null> {
    try {
        // 1. Get the default branch SHA
        const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' }
        });
        if (!repoRes.ok) return null;
        const repoData = await repoRes.json();
        const defaultBranch = repoData.default_branch || 'main';

        // 2. Get the SHA of the default branch tip
        const refRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${defaultBranch}`, {
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' }
        });
        if (!refRes.ok) return null;
        const refData = await refRes.json();
        const sha = refData.object?.sha;
        if (!sha) return null;

        // 3. Create the new branch
        const createRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha })
        });

        if (!createRes.ok) {
            const errData = await createRes.json();
            console.error('GitHub branch creation failed:', errData.message);
            return null;
        }

        return branchName;
    } catch (err: any) {
        console.error('createGithubBranch error:', err.message);
        return null;
    }
}

export const getTasks = async (req: AuthRequest, res: Response) => {
    try {
        const { projectId } = req.query;
        const query: any = {};

        if (req.user!.role === 'admin') {
            // Admin sees all tasks (optionally filtered by project)
            if (projectId) query.projectId = projectId;

        } else if (req.user!.role === 'client') {
            // Clients are linked to projects via clientId, not members[]
            const clientProjects = await Project.find({ clientId: req.user!.clientId }).select('_id');
            const allowedProjectIds = clientProjects.map(p => p._id);

            if (projectId) {
                const allowed = allowedProjectIds.some(id => id.toString() === projectId);
                if (!allowed) return res.json([]);
                query.projectId = projectId;
            } else {
                query.projectId = { $in: allowedProjectIds };
            }

        } else {
            // manager/member: projects where they are in members[]
            const memberProjects = await Project.find({ members: req.user!.userId }).select('_id');
            const allowedProjectIds = memberProjects.map(p => p._id);

            if (projectId) {
                const allowed = allowedProjectIds.some(id => id.toString() === projectId);
                if (!allowed) return res.json([]);
                query.projectId = projectId;
            } else {
                query.projectId = { $in: allowedProjectIds };
            }
        }

        const tasks = await Task.find(query).populate('assigneeId', 'firstName lastName email');
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const createTask = async (req: AuthRequest, res: Response) => {
    try {
        const validated = TaskSchema.parse(req.body);

        // Create the task first
        const task = await Task.create({ ...validated });

        // Auto-create GitHub branch if project has a linked repo
        if (validated.projectId) {
            const project = await Project.findById(validated.projectId);
            if (project?.githubRepoOwner && project?.githubRepoName) {
                const config = await GithubConfig.findOne();
                if (config?.personalAccessToken) {
                    // Branch name: task/{taskId}-{slugified-title}
                    const slug = validated.title
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/^-|-$/g, '')
                        .substring(0, 40);
                    const branchName = `task/${task._id.toString().slice(-6)}-${slug}`;

                    const createdBranch = await createGithubBranch(
                        config.personalAccessToken,
                        project.githubRepoOwner,
                        project.githubRepoName,
                        branchName
                    );

                    if (createdBranch) {
                        task.githubBranch = createdBranch;
                        await task.save();
                    }
                }
            }
        }

        res.status(201).json(task);
        // Notify project room of new task
        if (task.projectId) emitToProject(task.projectId.toString(), 'task:created', task);
    } catch (error: any) {
        if (error.issues) return res.status(400).json({ errors: error.issues });
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateTask = async (req: AuthRequest, res: Response) => {
    try {
        const existingTask = await Task.findById(req.params.id);
        if (!existingTask) return res.status(404).json({ message: 'Task not found' });

        const clarificationRequest = isClarificationRequestPayload(req.body);
        if (clarificationRequest && !INTERNAL_ROLES.includes(req.user!.role)) {
            return res.status(403).json({ message: 'Only admin and team members can request clarification' });
        }

        const patch: any = { ...req.body };
        if (clarificationRequest) {
            patch.status = 'clarification';
            patch.needsClarification = true;
        }
        if (patch.status === 'clarified') {
            patch.needsClarification = false;
        }

        const task = await Task.findByIdAndUpdate(
            req.params.id,
            patch,
            { new: true }
        );

        if (!task) return res.status(404).json({ message: 'Task not found' });
        res.json(task);

        if (clarificationRequest && task.projectId) {
            emitToAll('notification:created', {
                type: 'clarification_requested',
                taskId: task._id,
                projectId: task.projectId,
                title: task.title,
                message: `Clarification requested for task: ${task.title}`,
                recipientRoles: ['admin', 'client'],
                createdAt: new Date().toISOString(),
            });
        }

        // Notify project room of updated task
        if (task.projectId) emitToProject(task.projectId.toString(), 'task:updated', task);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const deleteTask = async (req: AuthRequest, res: Response) => {
    try {
        if (!INTERNAL_ROLES.includes(req.user!.role)) {
            return res.status(403).json({ message: 'Only admin and team members can delete tasks' });
        }

        const task = await Task.findByIdAndDelete(req.params.id);
        if (!task) return res.status(404).json({ message: 'Task not found' });

        res.json({ message: 'Task deleted' });
        if (task.projectId) {
            emitToProject(task.projectId.toString(), 'task:deleted', {
                _id: task._id,
                projectId: task.projectId,
            });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const uploadAttachment = async (req: AuthRequest, res: Response) => {
    try {
        const { name, mimeType, size, data } = req.body;
        if (!name || !mimeType || !data) {
            return res.status(400).json({ message: 'name, mimeType, and data are required' });
        }
        // 5 MB limit on base64 string (~3.7MB raw file)
        if (data.length > 5 * 1024 * 1024 * 1.4) {
            return res.status(413).json({ message: 'File too large. Max 5 MB.' });
        }
        const task = await Task.findByIdAndUpdate(
            req.params.id,
            { $push: { attachments: { name, mimeType, size, data, uploadedAt: new Date() } } },
            { new: true }
        );
        if (!task) return res.status(404).json({ message: 'Task not found' });
        res.json(task);
        if (task.projectId) emitToProject(task.projectId.toString(), 'task:updated', task);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const deleteAttachment = async (req: AuthRequest, res: Response) => {
    try {
        const { attachmentIndex } = req.params;
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: 'Task not found' });

        const idx = parseInt(attachmentIndex, 10);
        if (isNaN(idx) || !task.attachments || idx < 0 || idx >= task.attachments.length) {
            return res.status(400).json({ message: 'Invalid attachment index' });
        }

        task.attachments.splice(idx, 1);
        await task.save();
        res.json(task);
        if (task.projectId) emitToProject(task.projectId.toString(), 'task:updated', task);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
