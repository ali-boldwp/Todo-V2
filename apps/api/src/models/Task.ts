import mongoose, { Document, Schema } from 'mongoose';

export interface ITask extends Document {
    projectId: mongoose.Types.ObjectId;
    title: string;
    description?: string;
    status: 'todo' | 'in_progress' | 'review' | 'done';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    type: 'task' | 'bug' | 'feature';
    assigneeId?: mongoose.Types.ObjectId;
    dueDate?: Date;
    clarificationText?: any;
    githubBranch?: string;
    attachments?: Array<{
        name: string;
        mimeType: string;
        size: number;
        data: string; // base64
        uploadedAt: Date;
    }>;
}

const TaskSchema: Schema = new Schema({
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    title: { type: String, required: true },
    description: { type: Schema.Types.Mixed },
    status: { type: String, enum: ['todo', 'in_progress', 'review', 'done'], default: 'todo' },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    type: { type: String, enum: ['task', 'bug', 'feature'], default: 'task' },
    assigneeId: { type: Schema.Types.ObjectId, ref: 'User' },
    dueDate: { type: Date },
    needsClarification: { type: Boolean, default: false },
    clarificationText: { type: Schema.Types.Mixed },
    githubBranch: { type: String },
    attachments: [{
        name: { type: String, required: true },
        mimeType: { type: String, required: true },
        size: { type: Number, required: true },
        data: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now },
    }],
}, { timestamps: true });

export default mongoose.model<ITask>('Task', TaskSchema);
