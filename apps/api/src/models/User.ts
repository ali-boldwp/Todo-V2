import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
    organizationId: mongoose.Types.ObjectId;
    email: string;
    passwordHash: string;
    role: 'admin' | 'manager' | 'member' | 'client';
    clientId?: mongoose.Types.ObjectId;
    firstName: string;
    lastName: string;
    isActive: boolean;
}

const UserSchema: Schema = new Schema({
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'manager', 'member', 'client'], default: 'member' },
    clientId: { type: Schema.Types.ObjectId, ref: 'Client' },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Compound index for email to be unique is already handled by Schema definition
// UserSchema.index({ email: 1 }, { unique: true });

export default mongoose.model<IUser>('User', UserSchema);
