import { Router } from 'express';
import { checkIn, checkOut, getAttendance } from '../controllers/attendance.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getAttendance);
router.post('/check-in', checkIn);
router.post('/check-out', checkOut);

export default router;
