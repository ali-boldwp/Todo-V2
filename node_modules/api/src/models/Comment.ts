import mongoose, { Document, Schema } from 'mongoose';

export interface IComment extends Document {
    taskId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    content: string;
}

const CommentSchema: Schema = new Schema({
    taskId: { type: Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
}, { timestamps: true });

export default mongoose.model<IComment>('Comment', CommentSchema);
