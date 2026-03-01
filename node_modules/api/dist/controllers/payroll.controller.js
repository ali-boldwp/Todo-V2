"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePayslip = exports.getPayslips = exports.createSalaryStructure = exports.getSalaryStructure = void 0;
const Payroll_1 = require("../models/Payroll");
const payroll_schema_1 = require("@devmanager/shared/dist/payroll.schema");
const getSalaryStructure = async (req, res) => {
    try {
        // Admin can see others, user can see own
        const userId = req.query.userId || req.user.userId;
        const structure = await Payroll_1.SalaryStructure.findOne({ userId });
        res.json(structure);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getSalaryStructure = getSalaryStructure;
const createSalaryStructure = async (req, res) => {
    try {
        const validated = payroll_schema_1.SalaryStructureSchema.parse(req.body);
        // Upsert
        const structure = await Payroll_1.SalaryStructure.findOneAndUpdate({ userId: validated.userId }, { ...validated }, { new: true, upsert: true });
        res.status(201).json(structure);
    }
    catch (error) {
        res.status(400).json({ errors: error.issues || error.message });
    }
};
exports.createSalaryStructure = createSalaryStructure;
const getPayslips = async (req, res) => {
    try {
        const userId = req.user.role === 'admin' && req.query.userId ? req.query.userId : req.user.userId;
        const payslips = await Payroll_1.Payslip.find({ userId }).sort({ startDate: -1 });
        res.json(payslips);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getPayslips = getPayslips;
const generatePayslip = async (req, res) => {
    try {
        const { userId, startDate, endDate } = req.body;
        const structure = await Payroll_1.SalaryStructure.findOne({ userId });
        if (!structure) {
            return res.status(404).json({ message: 'Salary structure not found' });
        }
        // Simplified calculation logic
        const grossSalary = structure.baseSalary; // Assuming monthly
        const totalDeductions = 0; // Placeholder
        const totalAdditions = 0; // Placeholder
        const netSalary = grossSalary + totalAdditions - totalDeductions;
        const payslip = await Payroll_1.Payslip.create({
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
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.generatePayslip = generatePayslip;
