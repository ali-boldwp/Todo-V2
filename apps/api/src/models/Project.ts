import mongoose, { Document, Schema } from 'mongoose';

export interface IProject extends Document {
    clientId?: mongoose.Types.ObjectId;
    name: string;
    description?: any;
    status: 'active' | 'completed' | 'archived' | 'on_hold' | 'draft';
    visibility: 'public' | 'private';
    priority: 'low' | 'medium' | 'high';
    startDate?: Date;
    endDate?: Date;
    members: mongoose.Types.ObjectId[];
    githubRepoOwner?: string;
    githubRepoName?: string;
    documents: {
        _id?: mongoose.Types.ObjectId;
        title: string;
        description: string;
        fileData: string;
        mimeType: string;
        fileName: string;
        uploadedBy: mongoose.Types.ObjectId;
        uploadedAt: Date;
    }[];
}

const ProjectSchema: Schema = new Schema({
    clientId: { type: Schema.Types.ObjectId, ref: 'Client' },
    name: { type: String, required: true },
    description: { type: Schema.Types.Mixed },
    status: { type: String, enum: ['active', 'completed', 'archived', 'on_hold', 'draft'], default: 'active' },
    visibility: { type: String, enum: ['public', 'private'], default: 'private' },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    startDate: { type: Date },
    endDate: { type: Date },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    githubRepoOwner: { type: String },
    githubRepoName: { type: String },
    documents: [{
        title: { type: String, required: true },
        description: { type: String },
        fileData: { type: String, required: true },
        mimeType: { type: String, required: true },
        fileName: { type: String, required: true },
        uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        uploadedAt: { type: Date, default: Date.now }
    }]
}, { timestamps: true });

export default mongoose.model<IProject>('Project', ProjectSchema);
