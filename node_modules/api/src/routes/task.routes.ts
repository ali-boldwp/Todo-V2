import { Router } from 'express';
import { createTask, getTasks, updateTask, deleteTask, uploadAttachment, deleteAttachment, downloadAttachment, startTaskWork, stopTaskWork, pauseTaskWork, resumeTaskWork, finishTaskWork, approveTaskVerification, rejectTaskVerification, fixTaskBranch, getTaskActivityLogs, approveTaskClient, rejectTaskClient } from '../controllers/task.controller';
import { authenticate, requireGithubSetupForTeamMembers, requireProfileImageSetup } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(requireProfileImageSetup);
router.use(requireGithubSetupForTeamMembers);

router.get('/', getTasks);
router.get('/:id/logs', getTaskActivityLogs);
router.post('/', createTask);
router.patch('/:id', updateTask);
router.post('/:id/start', startTaskWork);
router.post('/:id/stop', stopTaskWork);
router.post('/:id/pause', pauseTaskWork);
router.post('/:id/resume', resumeTaskWork);
router.post('/:id/finish', finishTaskWork);
router.post('/:id/fix-branch', fixTaskBranch);
router.post('/:id/verify/approve', approveTaskVerification);
router.post('/:id/verify/reject', rejectTaskVerification);
router.post('/:id/client-approve', approveTaskClient);
router.post('/:id/client-reject', rejectTaskClient);
router.delete('/:id', deleteTask);
router.post('/:id/attachments', uploadAttachment);
router.delete('/:id/attachments/:attachmentIndex', deleteAttachment);
router.get('/:id/attachments/:attachmentIndex/download', downloadAttachment);

export default router;
