import { Router } from 'express';
import { login } from '../controllers/auth.controller';
import { authenticate, requireAdmin } from '../middleware/auth';
import { getTeamMembers, createTeamMember, updateTeamMember, deleteTeamMember, resetTeamMemberPassword } from '../controllers/team.controller';

const router = Router();

router.post('/login', login);

// Admin-only team member management
router.get('/team-members', authenticate, requireAdmin, getTeamMembers);
router.post('/team-members', authenticate, requireAdmin, createTeamMember);
router.patch('/team-members/:id', authenticate, requireAdmin, updateTeamMember);
router.delete('/team-members/:id', authenticate, requireAdmin, deleteTeamMember);
router.post('/team-members/:id/reset-password', authenticate, requireAdmin, resetTeamMemberPassword);

export default router;
