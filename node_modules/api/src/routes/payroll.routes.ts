import { Router } from 'express';
import { createSalaryStructure, generatePayslip, getPayslips, getSalaryStructure } from '../controllers/payroll.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/structure', getSalaryStructure);
router.post('/structure', authorize(['admin']), createSalaryStructure);

router.get('/payslips', getPayslips);
router.post('/payslips/generate', authorize(['admin']), generatePayslip);

export default router;
