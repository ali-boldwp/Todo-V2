import mongoose, { Document, Schema } from 'mongoose';

export interface IProject extends Document {
    organizationId: mongoose.Types.ObjectId;
    clientId?: mongoose.Types.ObjectId;
    name: string;
    description?: string;
    status: 'active' | 'completed' | 'archived' | 'on_hold';
    startDate?: Date;
    endDate?: Date;
}

const ProjectSchema: Schema = new Schema({
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'Client' },
    name: { type: String, required: true },
    description: { type: String },
    status: { type: String, enum: ['active', 'completed', 'archived', 'on_hold'], default: 'active' },
    startDate: { type: Date },
    endDate: { type: Date },
}, { timestamps: true });

export default mongoose.model<IProject>('Project', ProjectSchema);
