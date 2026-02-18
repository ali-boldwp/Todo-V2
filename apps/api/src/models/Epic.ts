import mongoose, { Document, Schema } from 'mongoose';

export interface IEpic extends Document {
    organizationId: mongoose.Types.ObjectId;
    projectId: mongoose.Types.ObjectId;
    title: string;
    description?: string;
    status: 'active' | 'completed' | 'archived';
    startDate?: Date;
    endDate?: Date;
}

const EpicSchema: Schema = new Schema({
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    title: { type: String, required: true },
    description: { type: String },
    status: { type: String, enum: ['active', 'completed', 'archived'], default: 'active' },
    startDate: { type: Date },
    endDate: { type: Date },
}, { timestamps: true });

export default mongoose.model<IEpic>('Epic', EpicSchema);
