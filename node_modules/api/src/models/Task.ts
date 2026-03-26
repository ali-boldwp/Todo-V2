import mongoose, { Document, Schema } from 'mongoose';

export interface ITask extends Document {
    projectId: mongoose.Types.ObjectId;
    title: string;
    description?: string;
    status: 'todo' | 'in_progress' | 'review' | 'done' | 'under_verification' | 'clarification' | 'clarified';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    type: 'task' | 'bug' | 'feature';
    assigneeId?: mongoose.Types.ObjectId;
    activeWorkerId?: mongoose.Types.ObjectId;
    workStartedAt?: Date;
    lastWorkStartedAt?: Date;
    isWorkPaused?: boolean;
    totalWorkedSeconds?: number;
    finishedAt?: Date;
    workLogs?: Array<{
        userId: mongoose.Types.ObjectId;
        seconds: number;
    }>;
    verificationStatus?: 'none' | 'pending' | 'approved' | 'rejected';
    verifierId?: mongoose.Types.ObjectId;
    verificationComment?: string;
    verificationDecidedAt?: Date;
    isMergedToDev?: boolean;
    dueDate?: Date;
    needsClarification?: boolean;
    clarificationText?: any;
    aiPrompt?: string;
    githubBranch?: string;
    attachments?: Array<{
        name: string;
        mimeType: string;
        size: number;
        data: string; // base64
        uploadedAt: Date;
    }>;
    activityLogs?: Array<{
        action: string;
        message: string;
        actorId?: mongoose.Types.ObjectId;
        actorRole?: string;
        metadata?: any;
        createdAt: Date;
    }>;
}

const TaskSchema: Schema = new Schema({
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    title: { type: String, required: true },
    description: { type: Schema.Types.Mixed },
    status: { type: String, enum: ['todo', 'in_progress', 'review', 'done', 'under_verification', 'clarification', 'clarified'], default: 'todo' },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    type: { type: String, enum: ['task', 'bug', 'feature'], default: 'task' },
    assigneeId: { type: Schema.Types.ObjectId, ref: 'User' },
    activeWorkerId: { type: Schema.Types.ObjectId, ref: 'User' },
    workStartedAt: { type: Date },
    lastWorkStartedAt: { type: Date },
    isWorkPaused: { type: Boolean, default: false },
    totalWorkedSeconds: { type: Number, default: 0 },
    finishedAt: { type: Date },
    workLogs: [{
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        seconds: { type: Number, required: true, default: 0 },
    }],
    verificationStatus: { type: String, enum: ['none', 'pending', 'approved', 'rejected'], default: 'none' },
    verifierId: { type: Schema.Types.ObjectId, ref: 'User' },
    verificationComment: { type: String },
    verificationDecidedAt: { type: Date },
    isMergedToDev: { type: Boolean, default: false },
    dueDate: { type: Date },
    needsClarification: { type: Boolean, default: false },
    clarificationText: { type: Schema.Types.Mixed },
    aiPrompt: { type: String },
    githubBranch: { type: String },
    attachments: [{
        name: { type: String, required: true },
        mimeType: { type: String, required: true },
        size: { type: Number, required: true },
        data: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now },
    }],
    activityLogs: [{
        action: { type: String, required: true },
        message: { type: String, required: true },
        actorId: { type: Schema.Types.ObjectId, ref: 'User' },
        actorRole: { type: String },
        metadata: { type: Schema.Types.Mixed },
        createdAt: { type: Date, default: Date.now }
    }],
}, { timestamps: true });

export default mongoose.model<ITask>('Task', TaskSchema);
