import { Router } from 'express';
import { createTask, getTasks, updateTask, deleteTask, uploadAttachment, deleteAttachment } from '../controllers/task.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getTasks);
router.post('/', createTask);
router.patch('/:id', updateTask);
router.delete('/:id', deleteTask);
router.post('/:id/attachments', uploadAttachment);
router.delete('/:id/attachments/:attachmentIndex', deleteAttachment);

export default router;
