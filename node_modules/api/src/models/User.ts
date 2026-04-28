import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
    email: string;
    profileImageUrl?: string;
    profileImageUploadedAt?: Date;
    githubUsername?: string;
    githubUserId?: string;
    githubProfileUrl?: string;
    githubConnectedAt?: Date;
    canVerifyTasks: boolean;
    passwordHash: string;
    role: 'admin' | 'manager' | 'member' | 'client' | 'client_assistant';
    clientId?: mongoose.Types.ObjectId;
    firstName: string;
    lastName: string;
    isActive: boolean;
}

const UserSchema: Schema = new Schema({
    email: { type: String, required: true, unique: true },
    profileImageUrl: { type: String },
    profileImageUploadedAt: { type: Date },
    githubUsername: { type: String },
    githubUserId: { type: String },
    githubProfileUrl: { type: String },
    githubConnectedAt: { type: Date },
    canVerifyTasks: { type: Boolean, default: false },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'manager', 'member', 'client', 'client_assistant'], default: 'member' },
    clientId: { type: Schema.Types.ObjectId, ref: 'Client' },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Compound index for email to be unique is already handled by Schema definition
// UserSchema.index({ email: 1 }, { unique: true });

// Performance indexes
UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1 });

export default mongoose.model<IUser>('User', UserSchema);
