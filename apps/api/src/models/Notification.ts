import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
    recipientId: mongoose.Types.ObjectId;
    actorUserId?: mongoose.Types.ObjectId;
    projectId?: mongoose.Types.ObjectId;
    taskId?: mongoose.Types.ObjectId;
    type: string;
    title: string;
    message: string;
    link?: string;
    metadata?: any;
    readAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

const NotificationSchema: Schema = new Schema(
    {
        recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        actorUserId: { type: Schema.Types.ObjectId, ref: 'User' },
        projectId: { type: Schema.Types.ObjectId, ref: 'Project', index: true },
        taskId: { type: Schema.Types.ObjectId, ref: 'Task', index: true },
        type: { type: String, required: true, index: true },
        title: { type: String, required: true },
        message: { type: String, required: true },
        link: { type: String },
        metadata: { type: Schema.Types.Mixed },
        readAt: { type: Date, default: null, index: true },
    },
    { timestamps: true }
);

NotificationSchema.index({ recipientId: 1, createdAt: -1 });

export default mongoose.model<INotification>('Notification', NotificationSchema);
