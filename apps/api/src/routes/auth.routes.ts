import { Router } from 'express';
import { getGithubSetupStatus, getGithubSetupUrl, handleGithubSetupCallback, login } from '../controllers/auth.controller';
import { authenticate, requireAdmin } from '../middleware/auth';
import { getTeamMembers, createTeamMember, updateTeamMember, deleteTeamMember, resetTeamMemberPassword } from '../controllers/team.controller';

const router = Router();

router.post('/login', login);
router.get('/github/setup/callback', handleGithubSetupCallback);
router.get('/github/setup/url', authenticate, getGithubSetupUrl);
router.get('/github/setup/status', authenticate, getGithubSetupStatus);

// Admin-only team member management
router.get('/team-members', authenticate, requireAdmin, getTeamMembers);
router.post('/team-members', authenticate, requireAdmin, createTeamMember);
router.patch('/team-members/:id', authenticate, requireAdmin, updateTeamMember);
router.delete('/team-members/:id', authenticate, requireAdmin, deleteTeamMember);
router.post('/team-members/:id/reset-password', authenticate, requireAdmin, resetTeamMemberPassword);

export default router;
