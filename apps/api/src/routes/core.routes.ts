import { Router } from 'express';
import { createClient, getClients } from '../controllers/client.controller';
import { createProject, getProject, getProjects, updateProject, addProjectMember, removeProjectMember, uploadProjectDocument, deleteProjectDocument } from '../controllers/project.controller';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/clients', getClients);
router.post('/clients', createClient);

router.get('/projects', getProjects);
router.post('/projects', createProject);
router.put('/projects/:id', updateProject);
router.get('/projects/:id', getProject);

// Documents
router.post('/projects/:id/documents', uploadProjectDocument);
router.delete('/projects/:id/documents/:docId', deleteProjectDocument);

// Admin-only: manage project members
router.post('/projects/:id/members', requireAdmin, addProjectMember);
router.delete('/projects/:id/members/:userId', requireAdmin, removeProjectMember);

export default router;
