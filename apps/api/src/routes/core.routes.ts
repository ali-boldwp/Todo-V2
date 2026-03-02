import { Router } from 'express';
import { createClient, getClients } from '../controllers/client.controller';
import { createProject, getProject, getProjects, updateProject, deleteProject, addProjectMember, removeProjectMember, uploadProjectDocument, deleteProjectDocument } from '../controllers/project.controller';
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

// Documents
router.post('/projects/:id/documents', uploadProjectDocument);
router.delete('/projects/:id/documents/:docId', deleteProjectDocument);

// Admin-only: manage project members
router.post('/projects/:id/members', requireAdmin, addProjectMember);
router.delete('/projects/:id/members/:userId', requireAdmin, removeProjectMember);

export default router;
