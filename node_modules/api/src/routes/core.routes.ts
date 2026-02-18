import { Router } from 'express';
import { createClient, getClients } from '../controllers/client.controller';
import { createProject, getProject, getProjects } from '../controllers/project.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/clients', getClients);
router.post('/clients', createClient);

router.get('/projects', getProjects);
router.post('/projects', createProject);
router.get('/projects/:id', getProject);

export default router;
