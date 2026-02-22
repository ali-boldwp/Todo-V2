import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { SalaryStructure, Payslip } from '../models/Payroll';
import { SalaryStructureSchema } from '@devmanager/shared/dist/payroll.schema';

export const getSalaryStructure = async (req: AuthRequest, res: Response) => {
    try {
        // Admin can see others, user can see own
        const userId = req.query.userId || req.user!.userId;
        const structure = await SalaryStructure.findOne({ userId });
        res.json(structure);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const createSalaryStructure = async (req: AuthRequest, res: Response) => {
    try {
        const validated = SalaryStructureSchema.parse(req.body);
        // Upsert
        const structure = await SalaryStructure.findOneAndUpdate(
            { userId: validated.userId },
            { ...validated },
            { new: true, upsert: true }
        );
        res.status(201).json(structure);
    } catch (error: any) {
        res.status(400).json({ errors: error.issues || error.message });
    }
};

export const getPayslips = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.role === 'admin' && req.query.userId ? req.query.userId : req.user!.userId;
        const payslips = await Payslip.find({ userId }).sort({ startDate: -1 });
        res.json(payslips);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const generatePayslip = async (req: AuthRequest, res: Response) => {
    try {
        const { userId, startDate, endDate } = req.body;

        const structure = await SalaryStructure.findOne({ userId });

        if (!structure) {
            return res.status(404).json({ message: 'Salary structure not found' });
        }

        // Simplified calculation logic
        const grossSalary = structure.baseSalary; // Assuming monthly
        const totalDeductions = 0; // Placeholder
        const totalAdditions = 0; // Placeholder
        const netSalary = grossSalary + totalAdditions - totalDeductions;

        const payslip = await Payslip.create({
            userId,
            startDate,
            endDate,
            grossSalary,
            totalDeductions,
            totalAdditions,
            netSalary,
            status: 'draft'
        });

        res.status(201).json(payslip);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
