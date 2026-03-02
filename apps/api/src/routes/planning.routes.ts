import { Router } from 'express';
import { createEpic, createSprint, getEpics, getSprints } from '../controllers/planning.controller';
import { authenticate, requireGithubSetupForTeamMembers, requireProfileImageSetup } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(requireProfileImageSetup);
router.use(requireGithubSetupForTeamMembers);

router.get('/epics', getEpics);
router.post('/epics', createEpic);

router.get('/sprints', getSprints);
router.post('/sprints', createSprint);

export default router;
