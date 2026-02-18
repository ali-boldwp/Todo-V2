import { Router } from 'express';
import { getGithubConfig, saveGithubConfig, syncIssues } from '../controllers/github.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/config', authorize(['admin']), getGithubConfig);
router.post('/config', authorize(['admin']), saveGithubConfig);
router.post('/sync', authorize(['admin']), syncIssues);

export default router;
