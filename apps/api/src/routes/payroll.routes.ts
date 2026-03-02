import { Router } from 'express';
import { createSalaryStructure, generatePayslip, getPayslips, getSalaryStructure } from '../controllers/payroll.controller';
import { authenticate, authorize, requireGithubSetupForTeamMembers } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(requireGithubSetupForTeamMembers);

router.get('/structure', getSalaryStructure);
router.post('/structure', authorize(['admin']), createSalaryStructure);

router.get('/payslips', getPayslips);
router.post('/payslips/generate', authorize(['admin']), generatePayslip);

export default router;
