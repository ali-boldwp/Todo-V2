import mongoose, { Document, Schema } from 'mongoose';

export interface IProject extends Document {
    organizationId: mongoose.Types.ObjectId;
    clientId?: mongoose.Types.ObjectId;
    name: string;
    description?: any;
    status: 'active' | 'completed' | 'archived' | 'on_hold' | 'draft';
    visibility: 'public' | 'private';
    priority: 'low' | 'medium' | 'high';
    startDate?: Date;
    endDate?: Date;
    members: mongoose.Types.ObjectId[];
}

const ProjectSchema: Schema = new Schema({
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'Client' },
    name: { type: String, required: true },
    description: { type: Schema.Types.Mixed },
    status: { type: String, enum: ['active', 'completed', 'archived', 'on_hold', 'draft'], default: 'active' },
    visibility: { type: String, enum: ['public', 'private'], default: 'private' },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    startDate: { type: Date },
    endDate: { type: Date },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

export default mongoose.model<IProject>('Project', ProjectSchema);
