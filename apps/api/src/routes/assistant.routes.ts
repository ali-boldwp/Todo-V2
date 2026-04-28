import { Router } from 'express';
import { authenticate, authorize, requireProfileImageSetup } from '../middleware/auth';
import { getAssistants, createAssistant, deleteAssistant, assignAssistantToProject, unassignAssistantFromProject } from '../controllers/assistant.controller';

const router = Router();

router.use(authenticate);
router.use(requireProfileImageSetup);

// Only clients can access these routes
router.use(authorize(['client']));

router.get('/', getAssistants);
router.post('/', createAssistant);
router.delete('/:id', deleteAssistant);
router.post('/:id/projects', assignAssistantToProject);
router.delete('/:id/projects/:projectId', unassignAssistantFromProject);

export default router;
