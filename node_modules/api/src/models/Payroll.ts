import mongoose, { Document, Schema } from 'mongoose';

export interface ISalaryStructure extends Document {
    userId: mongoose.Types.ObjectId;
    baseSalary: number;
    allowances: Map<string, number>;
    deductions: Map<string, number>;
    currency: string;
}

const SalaryStructureSchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    baseSalary: { type: Number, required: true },
    allowances: { type: Map, of: Number },
    deductions: { type: Map, of: Number },
    currency: { type: String, default: 'USD' },
}, { timestamps: true });

export const SalaryStructure = mongoose.model<ISalaryStructure>('SalaryStructure', SalaryStructureSchema);

export interface IPayslip extends Document {
    userId: mongoose.Types.ObjectId;
    startDate: Date;
    endDate: Date;
    grossSalary: number;
    netSalary: number;
    totalDeductions: number;
    totalAdditions: number;
    status: 'draft' | 'paid';
}

const PayslipSchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    grossSalary: { type: Number, required: true },
    netSalary: { type: Number, required: true },
    totalDeductions: { type: Number, required: true },
    totalAdditions: { type: Number, required: true },
    status: { type: String, enum: ['draft', 'paid'], default: 'draft' },
}, { timestamps: true });

export const Payslip = mongoose.model<IPayslip>('Payslip', PayslipSchema);
