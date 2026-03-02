import { Router } from 'express';
import { createComment, getComments } from '../controllers/comment.controller';
import { authenticate, requireGithubSetupForTeamMembers } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(requireGithubSetupForTeamMembers);

router.get('/:taskId', getComments);
router.post('/:taskId', createComment);

export default router;
