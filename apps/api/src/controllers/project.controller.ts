import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Project from '../models/Project';
import GithubConfig from '../models/GithubConfig';
import User from '../models/User';
import { ProjectSchema } from '@devmanager/shared/dist/project.schema';
import { emitToAll } from '../socket';
import { createAndDispatchNotifications, getProjectRelatedUserIds } from '../services/notification.service';

const ACCESS_FIELD_KEYS = ['projectUrl', 'devWebsiteUrl', 'accessAccounts'] as const;
const MEMBER_ALLOWED_UPDATE_KEYS = ['description'] as const;

const hasProjectAccessFieldInPayload = (payload: Record<string, any>) =>
    ACCESS_FIELD_KEYS.some((key) => Object.prototype.hasOwnProperty.call(payload || {}, key));

const hasAnyKeyOutsideAllowList = (payload: Record<string, any>, allowed: readonly string[]) => {
    const keys = Object.keys(payload || {});
    return keys.some((key) => !allowed.includes(key));
};

const sanitizeProjectForViewer = (project: any, role?: string) => {
    const obj = typeof project?.toObject === 'function' ? project.toObject() : project;
    if (role === 'admin') return obj;
    if (role === 'client') {
        const { devWebsiteUrl, accessAccounts, ...rest } = obj || {};
        return rest;
    }
    const { projectUrl, accessAccounts, ...rest } = obj || {};
    return rest;
};

const ensureProjectAccess = (project: any, user: AuthRequest['user']) => {
    if (!project || !user) return false;
    if (user.role === 'admin') return true;
    if (user.role === 'client') return project.clientId?.toString?.() === user.clientId;
    if (user.role === 'manager' || user.role === 'member') {
        return project.members?.some?.((member: any) => member?.toString?.() === user.userId);
    }
    return false;
};

const buildProjectLink = (projectId: any) => (projectId ? `/projects/${projectId.toString()}/overview` : undefined);

const notifyProjectAudience = async (input: {
    project: any;
    actorUserId?: string;
    type: string;
    title: string;
    message: string;
    recipientIds?: string[];
}) => {
    if (!input.project?._id) return;
    const audience = await getProjectRelatedUserIds(input.project._id);
    await createAndDispatchNotifications({
        recipientIds: [...audience, ...(input.recipientIds || [])],
        actorUserId: input.actorUserId,
        projectId: input.project._id,
        type: input.type,
        title: input.title,
        message: input.message,
        link: buildProjectLink(input.project._id),
    });
};

const getRepoDetails = async (token: string, owner: string, repo: string) => {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github.v3+json',
        },
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch repository ${owner}/${repo}: ${response.status} ${errorText}`);
    }
    return response.json();
};

const getBranchSha = async (token: string, owner: string, repo: string, branch: string): Promise<string | null> => {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branch)}`, {
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github.v3+json',
        },
    });
    if (response.status === 404) return null;
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch branch ${branch} for ${owner}/${repo}: ${response.status} ${errorText}`);
    }
    const data = await response.json();
    return data?.object?.sha || null;
};

const createBranch = async (token: string, owner: string, repo: string, branch: string, sha: string) => {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ref: `refs/heads/${branch}`, sha }),
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create ${branch} branch in ${owner}/${repo}: ${response.status} ${errorText}`);
    }
};

const ensureDevBranch = async (token: string, owner: string, repo: string) => {
    const existingDevSha = await getBranchSha(token, owner, repo, 'dev');
    if (existingDevSha) return { created: false, branch: 'dev' as const };

    const repoDetails = await getRepoDetails(token, owner, repo);
    const defaultBranch = repoDetails?.default_branch || 'main';
    const defaultBranchSha = await getBranchSha(token, owner, repo, defaultBranch);
    if (!defaultBranchSha) {
        throw new Error(`Unable to resolve default branch SHA (${defaultBranch}) for ${owner}/${repo}`);
    }

    await createBranch(token, owner, repo, 'dev', defaultBranchSha);
    return { created: true, branch: 'dev' as const };
};


export const getProjects = async (req: AuthRequest, res: Response) => {
    try {
        const query: any = {};

        if (req.user!.role !== 'admin') {
            if (req.user!.role === 'client' && req.user!.clientId) {
                query.clientId = req.user!.clientId;
            } else {
                // manager/member: only projects they are explicitly assigned to
                query.members = req.user!.userId;
            }
        }

        const projects = await Project.find(query)
            .select('-documents.fileData')
            .populate('clientId', 'name');
        res.json(projects.map((project) => sanitizeProjectForViewer(project, req.user!.role)));
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const createProject = async (req: AuthRequest, res: Response) => {
    try {
        const validated = ProjectSchema.parse(req.body);

        let clientId = validated.clientId;
        if (req.user!.role === 'client') {
            clientId = req.user!.clientId?.toString();
        }

        let githubRepoOwner = validated.githubRepoOwner;
        let githubRepoName = validated.githubRepoName;

        if (validated.createGithubRepo) {
            const config = await GithubConfig.findOne();
            if (config && config.personalAccessToken) {
                const safeName = validated.name.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
                const response = await fetch('https://api.github.com/user/repos', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${config.personalAccessToken}`,
                        Accept: 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ name: safeName, private: true })
                });

                if (response.ok) {
                    const repoData = await response.json();
                    githubRepoOwner = repoData.owner.login;
                    githubRepoName = repoData.name;
                } else {
                    const errorText = await response.text();
                    console.error('createProject - GitHub Repo Creation Error:', response.status, errorText);
                    return res.status(400).json({ message: 'Failed to create GitHub repository. ' + errorText });
                }
            } else {
                return res.status(400).json({ message: 'GitHub integration is not connected.' });
            }
        }

        if (githubRepoOwner && githubRepoName) {
            const config = await GithubConfig.findOne();
            if (!config?.personalAccessToken) {
                return res.status(400).json({ message: 'GitHub integration is not connected.' });
            }
            try {
                await ensureDevBranch(config.personalAccessToken, githubRepoOwner, githubRepoName);
            } catch (error: any) {
                return res.status(400).json({ message: error?.message || 'Failed to ensure dev branch for repository' });
            }
        }

        const project = await Project.create({
            ...validated,
            clientId,
            githubRepoOwner,
            githubRepoName,
        });
        await notifyProjectAudience({
            project,
            actorUserId: req.user!.userId,
            type: 'project_created',
            title: 'Project Created',
            message: `Project "${project.name}" was created.`,
        });
        res.status(201).json(project);
    } catch (error: any) {
        if (error.issues) return res.status(400).json({ errors: error.issues });
        res.status(500).json({ message: 'Server error' });
    }
};

export const getProject = async (req: AuthRequest, res: Response) => {
    try {
        const query: any = { _id: req.params.id };

        if (req.user!.role !== 'admin') {
            if (req.user!.role === 'client') {
                query.clientId = req.user!.clientId;
            } else {
                query.members = req.user!.userId;
            }
        }

        const project = await Project.findOne(query)
            .select('-documents.fileData')
            .populate('clientId', 'name')
            .populate('members', 'firstName lastName email role')
            .populate('documents.uploadedBy', 'firstName lastName email');
        if (!project) return res.status(404).json({ message: 'Project not found' });
        res.json(sanitizeProjectForViewer(project, req.user!.role));
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateProject = async (req: AuthRequest, res: Response) => {
    try {
        const existingProject = await Project.findById(req.params.id).select('_id clientId members');
        if (!existingProject) return res.status(404).json({ message: 'Project not found' });
        if (!ensureProjectAccess(existingProject, req.user)) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        if (req.user!.role === 'client') {
            return res.status(403).json({ message: 'Clients cannot update projects' });
        }

        if (req.user!.role === 'member' && hasAnyKeyOutsideAllowList(req.body || {}, MEMBER_ALLOWED_UPDATE_KEYS)) {
            return res.status(403).json({ message: 'Members can only update project overview content' });
        }

        if (req.user!.role !== 'admin' && hasProjectAccessFieldInPayload(req.body || {})) {
            return res.status(403).json({ message: 'Only admin can update project access credentials' });
        }

        const validated = ProjectSchema.partial().parse(req.body);

        let githubRepoOwner = validated.githubRepoOwner;
        let githubRepoName = validated.githubRepoName;

        if (validated.createGithubRepo && validated.name) {
            const config = await GithubConfig.findOne();
            if (config && config.personalAccessToken) {
                const safeName = validated.name.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
                const response = await fetch('https://api.github.com/user/repos', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${config.personalAccessToken}`,
                        Accept: 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ name: safeName, private: true })
                });

                if (response.ok) {
                    const repoData = await response.json();
                    githubRepoOwner = repoData.owner.login;
                    githubRepoName = repoData.name;
                    console.log('updateProject - Repo created successfully:', githubRepoOwner, githubRepoName);
                } else {
                    const errorText = await response.text();
                    console.error('updateProject - GitHub Repo Creation Error:', response.status, errorText);
                    return res.status(400).json({ message: 'Failed to create GitHub repository. ' + errorText });
                }
            } else {
                return res.status(400).json({ message: 'GitHub integration is not connected.' });
            }
        }

        const updateData: any = { ...validated };
        // Allow explicit clearing of repo linkage from project settings.
        if (Object.prototype.hasOwnProperty.call(validated, 'githubRepoOwner')) {
            updateData.githubRepoOwner = githubRepoOwner || undefined;
        }
        if (Object.prototype.hasOwnProperty.call(validated, 'githubRepoName')) {
            updateData.githubRepoName = githubRepoName || undefined;
        }

        if (updateData.githubRepoOwner && updateData.githubRepoName) {
            const config = await GithubConfig.findOne();
            if (!config?.personalAccessToken) {
                return res.status(400).json({ message: 'GitHub integration is not connected.' });
            }
            try {
                await ensureDevBranch(config.personalAccessToken, updateData.githubRepoOwner, updateData.githubRepoName);
            } catch (error: any) {
                return res.status(400).json({ message: error?.message || 'Failed to ensure dev branch for repository' });
            }
        }

        const project = await Project.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        if (!project) return res.status(404).json({ message: 'Project not found' });
        await notifyProjectAudience({
            project,
            actorUserId: req.user!.userId,
            type: 'project_updated',
            title: 'Project Updated',
            message: `Project "${project.name}" was updated.`,
        });
        res.json(sanitizeProjectForViewer(project, req.user!.role));
    } catch (error: any) {
        if (error.issues) return res.status(400).json({ errors: error.issues });
        res.status(500).json({ message: 'Server error' });
    }
};

export const deleteProject = async (req: AuthRequest, res: Response) => {
    try {
        if (req.user!.role !== 'admin') {
            return res.status(403).json({ message: 'Only admins can delete projects' });
        }

        const project = await Project.findById(req.params.id).select('_id name');
        if (!project) return res.status(404).json({ message: 'Project not found' });
        const recipientIds = await getProjectRelatedUserIds(project._id);
        await Project.findByIdAndDelete(req.params.id);

        emitToAll('project:updated', null); // Optionally notify clients to refresh project list
        await createAndDispatchNotifications({
            recipientIds,
            actorUserId: req.user!.userId,
            projectId: project._id,
            type: 'project_deleted',
            title: 'Project Deleted',
            message: `Project "${project.name}" was deleted.`,
            link: '/projects',
        });
        res.json({ message: 'Project deleted successfully' });
    } catch (error) {
        console.error('Error deleting project:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const addProjectMember = async (req: AuthRequest, res: Response) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ message: 'userId is required' });

        const user = await User.findById(userId).select('githubUsername githubUserId githubConnectedAt email role firstName');
        if (!user) return res.status(404).json({ message: 'User not found' });

        const needsGithubSetup = ['manager', 'member'].includes(user.role || '');
        if (needsGithubSetup && (!user.githubUsername || !user.githubUserId || !user.githubConnectedAt)) {
            return res.status(400).json({ message: 'This team member must complete GitHub setup before being assigned to projects.' });
        }

        const project = await Project.findByIdAndUpdate(
            req.params.id,
            { $addToSet: { members: userId } },
            { new: true }
        ).populate('members', 'firstName lastName email role githubUsername');

        if (!project) return res.status(404).json({ message: 'Project not found' });

        // Best-effort GitHub collaborator sync. Do not block assignment on GitHub errors.
        if (project.githubRepoOwner && project.githubRepoName) {
            const githubUsername = user.githubUsername?.trim();
            if (githubUsername) {
                const config = await GithubConfig.findOne();
                if (config?.personalAccessToken) {
                    const response = await fetch(
                        `https://api.github.com/repos/${project.githubRepoOwner}/${project.githubRepoName}/collaborators/${encodeURIComponent(githubUsername)}`,
                        {
                            method: 'PUT',
                            headers: {
                                Authorization: `Bearer ${config.personalAccessToken}`,
                                Accept: 'application/vnd.github.v3+json',
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ permission: 'push' })
                        }
                    );

                    if (!response.ok) {
                        const errorText = await response.text();
                        console.error(
                            `Failed to add GitHub collaborator ${githubUsername} to ${project.githubRepoOwner}/${project.githubRepoName}:`,
                            response.status,
                            errorText
                        );
                    }
                }
            } else {
                console.warn(
                    `Skipped GitHub collaborator sync for user ${user._id}: missing githubUsername`
                );
            }
        }

        await notifyProjectAudience({
            project,
            actorUserId: req.user!.userId,
            type: 'project_member_added',
            title: 'Project Member Added',
            message: `${user.firstName || user.email} was added to project "${project.name}".`,
            recipientIds: [userId],
        });
        res.json(project);
        emitToAll('project:updated', project);
    } catch (error) {
        console.error('addProjectMember error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const fixProjectRepo = async (req: AuthRequest, res: Response) => {
    try {
        if (req.user!.role !== 'admin') {
            return res.status(403).json({ message: 'Only admins can fix repository configuration' });
        }

        const project = await Project.findById(req.params.id).select('_id githubRepoOwner githubRepoName');
        if (!project) return res.status(404).json({ message: 'Project not found' });
        if (!project.githubRepoOwner || !project.githubRepoName) {
            return res.status(400).json({ message: 'Project has no linked GitHub repository' });
        }

        const config = await GithubConfig.findOne();
        if (!config?.personalAccessToken) {
            return res.status(400).json({ message: 'GitHub integration is not connected.' });
        }

        const result = await ensureDevBranch(
            config.personalAccessToken,
            project.githubRepoOwner,
            project.githubRepoName
        );

        res.json({
            message: result.created ? 'Repository fixed. dev branch created.' : 'Repository already valid. dev branch exists.',
            branch: result.branch,
            created: result.created,
            repo: `${project.githubRepoOwner}/${project.githubRepoName}`,
        });
    } catch (error: any) {
        res.status(500).json({ message: error?.message || 'Failed to fix repository' });
    }
};

export const getProjectRepoStatus = async (req: AuthRequest, res: Response) => {
    try {
        if (req.user!.role !== 'admin') {
            return res.status(403).json({ message: 'Only admins can view repository status' });
        }

        const project = await Project.findById(req.params.id).select('_id githubRepoOwner githubRepoName');
        if (!project) return res.status(404).json({ message: 'Project not found' });
        if (!project.githubRepoOwner || !project.githubRepoName) {
            return res.json({
                hasRepo: false,
                devBranchReady: false,
                message: 'No GitHub repository linked',
            });
        }

        const config = await GithubConfig.findOne();
        if (!config?.personalAccessToken) {
            return res.status(400).json({ message: 'GitHub integration is not connected.' });
        }

        const devSha = await getBranchSha(
            config.personalAccessToken,
            project.githubRepoOwner,
            project.githubRepoName,
            'dev'
        );

        return res.json({
            hasRepo: true,
            repo: `${project.githubRepoOwner}/${project.githubRepoName}`,
            devBranchReady: Boolean(devSha),
            message: devSha ? 'dev branch exists' : 'dev branch missing',
        });
    } catch (error: any) {
        return res.status(500).json({ message: error?.message || 'Failed to get repository status' });
    }
};


export const removeProjectMember = async (req: AuthRequest, res: Response) => {
    try {
        const project = await Project.findByIdAndUpdate(
            req.params.id,
            { $pull: { members: req.params.userId } },
            { new: true }
        ).populate('members', 'firstName lastName email role');

        if (!project) return res.status(404).json({ message: 'Project not found' });
        await notifyProjectAudience({
            project,
            actorUserId: req.user!.userId,
            type: 'project_member_removed',
            title: 'Project Member Removed',
            message: `A member was removed from project "${project.name}".`,
            recipientIds: [req.params.userId],
        });
        res.json(project);
        emitToAll('project:updated', project);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// --- Documents ---

export const uploadProjectDocument = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { title, description, fileData, mimeType, fileName } = req.body;

        if (!title || !fileData || !mimeType || !fileName) {
            return res.status(400).json({ message: 'Missing required document fields' });
        }

        const project = await Project.findById(id);
        if (!project) return res.status(404).json({ message: 'Project not found' });

        // Ensure user has access to project
        if (req.user!.role === 'client' && project.clientId?.toString() !== req.user!.clientId) {
            return res.status(403).json({ message: 'Not authorized' });
        }
        if (req.user!.role === 'manager' || req.user!.role === 'member') {
            if (!project.members.includes(req.user!.userId as any)) {
                return res.status(403).json({ message: 'Not authorized' });
            }
        }

        project.documents.push({
            title,
            description: description || '',
            fileData,
            mimeType,
            fileName,
            uploadedBy: req.user!.userId as any,
            uploadedAt: new Date()
        });

        await project.save();
        await project.populate('documents.uploadedBy', 'firstName lastName email');

        await notifyProjectAudience({
            project,
            actorUserId: req.user!.userId,
            type: 'project_document_uploaded',
            title: 'Project Document Uploaded',
            message: `A document "${title}" was uploaded in "${project.name}".`,
        });
        res.status(201).json(project.documents[project.documents.length - 1]);
    } catch (error: any) {
        console.error('Error uploading document:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const deleteProjectDocument = async (req: AuthRequest, res: Response) => {
    try {
        const { id, docId } = req.params;

        const project = await Project.findById(id);
        if (!project) return res.status(404).json({ message: 'Project not found' });

        const docIndex = project.documents.findIndex(d => d._id?.toString() === docId);
        if (docIndex === -1) return res.status(404).json({ message: 'Document not found' });

        const doc = project.documents[docIndex];

        // Access control for deletion: Admin can delete any. Others can only delete their own.
        if (req.user!.role !== 'admin' && doc.uploadedBy.toString() !== req.user!.userId) {
            return res.status(403).json({ message: 'You can only delete your own documents' });
        }

        project.documents.splice(docIndex, 1);
        await project.save();

        await notifyProjectAudience({
            project,
            actorUserId: req.user!.userId,
            type: 'project_document_deleted',
            title: 'Project Document Deleted',
            message: `A project document was deleted in "${project.name}".`,
        });
        res.json({ message: 'Document deleted successfully' });
    } catch (error) {
        console.error('Error deleting document:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const downloadProjectDocument = async (req: AuthRequest, res: Response) => {
    try {
        const { id, docId } = req.params;
        const project = await Project.findById(id);
        if (!project) return res.status(404).json({ message: 'Project not found' });

        if (!ensureProjectAccess(project, req.user)) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const doc = project.documents.find((d) => d._id?.toString() === docId);
        if (!doc) return res.status(404).json({ message: 'Document not found' });

        res.json({
            _id: doc._id,
            title: doc.title,
            fileName: doc.fileName,
            mimeType: doc.mimeType,
            fileData: doc.fileData,
        });
    } catch (error) {
        console.error('Error downloading document:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// ─── Antigravity Repo Setup ────────────────────────────────────────────────

/**
 * POST /projects/:id/setup-repo
 * Clones (or pulls) the project's GitHub repo to the server local filesystem
 * so Antigravity can use it as codebase context for AI task planning.
 */
export const setupProjectRepo = async (req: AuthRequest, res: Response) => {
    try {
        const project = await Project.findById(req.params.id)
            .select('_id name githubRepoOwner githubRepoName repoLocalPath repoClonedAt');
        if (!project) return res.status(404).json({ message: 'Project not found' });

        if (!project.githubRepoOwner || !project.githubRepoName) {
            return res.status(400).json({
                message: 'Project has no linked GitHub repository. Link a repo in project settings first.',
            });
        }

        const githubConfig = await GithubConfig.findOne();
        if (!githubConfig?.personalAccessToken) {
            return res.status(400).json({ message: 'GitHub integration is not connected.' });
        }

        // Dynamically import to keep repo logic separated
        const { cloneOrPullRepo } = await import('../services/repo.service');

        const repoLocalPath = await cloneOrPullRepo(
            project._id.toString(),
            project.githubRepoOwner,
            project.githubRepoName,
            githubConfig.personalAccessToken
        );

        // Store the local path on the project document
        await Project.findByIdAndUpdate(project._id, {
            repoLocalPath,
            repoClonedAt: new Date(),
        });

        return res.json({
            message: `Repo cloned successfully. Antigravity will use this codebase when planning tasks for "${project.name}".`,
            repoLocalPath,
            repo: `${project.githubRepoOwner}/${project.githubRepoName}`,
        });
    } catch (error: any) {
        console.error('setupProjectRepo error:', error.message);
        return res.status(500).json({ message: error?.message || 'Failed to setup repository' });
    }
};

/**
 * GET /projects/:id/ai-repo-status
 * Returns whether the local repo clone exists for Antigravity.
 */
export const getProjectAIRepoStatus = async (req: AuthRequest, res: Response) => {
    try {
        const project = await Project.findById(req.params.id)
            .select('_id name githubRepoOwner githubRepoName repoLocalPath repoClonedAt');
        if (!project) return res.status(404).json({ message: 'Project not found' });

        const { repoExists } = await import('../services/repo.service');
        const cloned = project.repoLocalPath ? repoExists(project._id.toString()) : false;

        return res.json({
            hasGithubRepo: Boolean(project.githubRepoOwner && project.githubRepoName),
            repo: project.githubRepoOwner
                ? `${project.githubRepoOwner}/${project.githubRepoName}`
                : null,
            cloned,
            repoLocalPath: cloned ? project.repoLocalPath : null,
            repoClonedAt: project.repoClonedAt || null,
            message: cloned
                ? 'Repo is cloned. Antigravity will use it for context-aware task planning.'
                : 'Repo not yet cloned. Call POST /setup-repo to enable AI codebase context.',
        });
    } catch (error: any) {
        return res.status(500).json({ message: error?.message || 'Server error' });
    }
};

