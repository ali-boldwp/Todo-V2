import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Project from '../models/Project';
import GithubConfig from '../models/GithubConfig';
import { ProjectSchema } from '@devmanager/shared/dist/project.schema';
import { emitToAll } from '../socket';

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

        const projects = await Project.find(query).populate('clientId', 'name');
        res.json(projects);
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

        const project = await Project.create({
            ...validated,
            clientId,
            githubRepoOwner,
            githubRepoName,
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

        const project = await Project.findOne(query).populate('clientId', 'name').populate('members', 'firstName lastName email role');
        if (!project) return res.status(404).json({ message: 'Project not found' });
        res.json(project);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateProject = async (req: AuthRequest, res: Response) => {
    try {
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
        if (githubRepoOwner) updateData.githubRepoOwner = githubRepoOwner;
        if (githubRepoName) updateData.githubRepoName = githubRepoName;

        const project = await Project.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        if (!project) return res.status(404).json({ message: 'Project not found' });
        res.json(project);
    } catch (error: any) {
        if (error.issues) return res.status(400).json({ errors: error.issues });
        res.status(500).json({ message: 'Server error' });
    }
};

export const addProjectMember = async (req: AuthRequest, res: Response) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ message: 'userId is required' });

        const project = await Project.findByIdAndUpdate(
            req.params.id,
            { $addToSet: { members: userId } },
            { new: true }
        ).populate('members', 'firstName lastName email role');

        if (!project) return res.status(404).json({ message: 'Project not found' });
        res.json(project);
        emitToAll('project:updated', project);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
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

        res.json({ message: 'Document deleted successfully' });
    } catch (error) {
        console.error('Error deleting document:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
