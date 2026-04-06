import { Router } from 'express';
import { getGithubConfig, saveGithubConfig, disconnectGithub, syncIssues, getGithubAuthUrl, handleGithubCallback, getRepositories } from '../controllers/github.controller';
import { authenticate, authorize, requireProfileImageSetup } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(requireProfileImageSetup);

router.get('/config', authorize(['admin']), getGithubConfig);
router.post('/config', authorize(['admin']), saveGithubConfig);
router.delete('/config', authorize(['admin']), disconnectGithub);
router.post('/sync', authorize(['admin']), syncIssues);

router.get('/auth/url', authorize(['admin']), getGithubAuthUrl);
router.post('/auth/callback', authorize(['admin']), handleGithubCallback);

router.get('/repos', authorize(['admin']), getRepositories);

export default router;
