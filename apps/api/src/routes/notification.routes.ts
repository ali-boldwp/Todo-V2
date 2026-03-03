import { Router } from 'express';
import {
    getMyNotifications,
    getMyUnreadNotificationCount,
    markAllNotificationsRead,
    markNotificationRead,
} from '../controllers/notification.controller';
import { authenticate, requireGithubSetupForTeamMembers, requireProfileImageSetup } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(requireProfileImageSetup);
router.use(requireGithubSetupForTeamMembers);

router.get('/', getMyNotifications);
router.get('/unread-count', getMyUnreadNotificationCount);
router.post('/read-all', markAllNotificationsRead);
router.post('/:id/read', markNotificationRead);

export default router;
