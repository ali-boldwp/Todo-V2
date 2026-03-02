import { Router } from 'express';
import { getGithubSetupStatus, getGithubSetupUrl, getProfileSetupStatus, handleGithubSetupCallback, login, uploadProfileImage } from '../controllers/auth.controller';
import { authenticate, requireAdmin, requireProfileImageSetup } from '../middleware/auth';
import { getTeamMembers, createTeamMember, updateTeamMember, deleteTeamMember, resetTeamMemberPassword } from '../controllers/team.controller';

const router = Router();

router.post('/login', login);
router.get('/github/setup/callback', handleGithubSetupCallback);
router.get('/profile/status', authenticate, getProfileSetupStatus);
router.post('/profile/image', authenticate, uploadProfileImage);
router.get('/github/setup/url', authenticate, getGithubSetupUrl);
router.get('/github/setup/status', authenticate, getGithubSetupStatus);

// Admin-only team member management
router.get('/team-members', authenticate, requireProfileImageSetup, requireAdmin, getTeamMembers);
router.post('/team-members', authenticate, requireProfileImageSetup, requireAdmin, createTeamMember);
router.patch('/team-members/:id', authenticate, requireProfileImageSetup, requireAdmin, updateTeamMember);
router.delete('/team-members/:id', authenticate, requireProfileImageSetup, requireAdmin, deleteTeamMember);
router.post('/team-members/:id/reset-password', authenticate, requireProfileImageSetup, requireAdmin, resetTeamMemberPassword);

export default router;
