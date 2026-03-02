import mongoose, { Document, Schema } from 'mongoose';

export interface IConversation extends Document {
    type: 'direct' | 'group';
    name?: string;
    projectId?: mongoose.Types.ObjectId;
    createdBy?: mongoose.Types.ObjectId;
    participants: mongoose.Types.ObjectId[];
    lastMessage?: string;
    lastMessageAt?: Date;
}

const ConversationSchema: Schema = new Schema(
    {
        type: { type: String, enum: ['direct', 'group'], default: 'direct' },
        name: { type: String },
        projectId: { type: Schema.Types.ObjectId, ref: 'Project' },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
        participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
        lastMessage: { type: String },
        lastMessageAt: { type: Date },
    },
    { timestamps: true }
);

ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ lastMessageAt: -1 });

export default mongoose.model<IConversation>('Conversation', ConversationSchema);
