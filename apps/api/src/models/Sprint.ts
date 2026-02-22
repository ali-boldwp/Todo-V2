import mongoose, { Document, Schema } from 'mongoose';

export interface ISprint extends Document {
    projectId: mongoose.Types.ObjectId;
    name: string;
    goal?: string;
    startDate: Date;
    endDate: Date;
    status: 'planned' | 'active' | 'completed';
}

const SprintSchema: Schema = new Schema({
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    name: { type: String, required: true },
    goal: { type: String },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, enum: ['planned', 'active', 'completed'], default: 'planned' },
}, { timestamps: true });

export default mongoose.model<ISprint>('Sprint', SprintSchema);
