import { Router } from 'express';
import { createTimeEntry, getTimeEntries, startTimer, stopTimer } from '../controllers/time.controller';
import { authenticate, requireGithubSetupForTeamMembers, requireProfileImageSetup } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(requireProfileImageSetup);
router.use(requireGithubSetupForTeamMembers);

router.get('/', getTimeEntries);
router.post('/', createTimeEntry);
router.post('/start', startTimer);
router.post('/stop', stopTimer);

export default router;
