import { Router } from 'express';
import { createClient, getClients } from '../controllers/client.controller';
import { createProject, getProject, getProjects, updateProject, deleteProject, addProjectMember, removeProjectMember, uploadProjectDocument, deleteProjectDocument, downloadProjectDocument, fixProjectRepo, getProjectRepoStatus, getProjectDockployStatus, triggerProjectDockployDeploy } from '../controllers/project.controller';
import { authenticate, requireAdmin, requireGithubSetupForTeamMembers, requireProfileImageSetup } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(requireProfileImageSetup);
router.use(requireGithubSetupForTeamMembers);

router.get('/clients', getClients);
router.post('/clients', createClient);

router.get('/projects', getProjects);
router.post('/projects', requireAdmin, createProject); // Note: Should clients be able to create projects? User said client shouldn't delete, maybe not create either? Let's stick to task strictly for now. Wait, I should make deleteProject requireAdmin.
router.put('/projects/:id', updateProject);
router.get('/projects/:id', getProject);
router.delete('/projects/:id', requireAdmin, deleteProject);
router.post('/projects/:id/fix-repo', requireAdmin, fixProjectRepo);
router.get('/projects/:id/repo-status', requireAdmin, getProjectRepoStatus);
router.get('/projects/:id/dockploy-status', requireAdmin, getProjectDockployStatus);
router.post('/projects/:id/dockploy-deploy', requireAdmin, triggerProjectDockployDeploy);

// Documents
router.post('/projects/:id/documents', uploadProjectDocument);
router.delete('/projects/:id/documents/:docId', deleteProjectDocument);
router.get('/projects/:id/documents/:docId/download', downloadProjectDocument);

// Admin-only: manage project members
router.post('/projects/:id/members', requireAdmin, addProjectMember);
router.delete('/projects/:id/members/:userId', requireAdmin, removeProjectMember);

export default router;
