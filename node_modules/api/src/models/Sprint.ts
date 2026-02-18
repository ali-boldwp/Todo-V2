import mongoose, { Document, Schema } from 'mongoose';

export interface ISprint extends Document {
    organizationId: mongoose.Types.ObjectId;
    projectId: mongoose.Types.ObjectId;
    name: string;
    goal?: string;
    startDate: Date;
    endDate: Date;
    status: 'planned' | 'active' | 'completed';
}

const SprintSchema: Schema = new Schema({
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    name: { type: String, required: true },
    goal: { type: String },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, enum: ['planned', 'active', 'completed'], default: 'planned' },
}, { timestamps: true });

export default mongoose.model<ISprint>('Sprint', SprintSchema);
