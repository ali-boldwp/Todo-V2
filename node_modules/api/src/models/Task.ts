import mongoose, { Document, Schema } from 'mongoose';

export interface ITask extends Document {
    organizationId: mongoose.Types.ObjectId;
    projectId: mongoose.Types.ObjectId;
    title: string;
    description?: string;
    status: 'todo' | 'in_progress' | 'review' | 'done';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    type: 'task' | 'bug' | 'feature';
    assigneeId?: mongoose.Types.ObjectId;
    dueDate?: Date;
}

const TaskSchema: Schema = new Schema({
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    title: { type: String, required: true },
    description: { type: String },
    status: { type: String, enum: ['todo', 'in_progress', 'review', 'done'], default: 'todo' },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    type: { type: String, enum: ['task', 'bug', 'feature'], default: 'task' },
    assigneeId: { type: Schema.Types.ObjectId, ref: 'User' },
    dueDate: { type: Date },
}, { timestamps: true });

export default mongoose.model<ITask>('Task', TaskSchema);
