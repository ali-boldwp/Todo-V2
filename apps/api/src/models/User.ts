import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
    organizationId: mongoose.Types.ObjectId;
    email: string;
    passwordHash: string;
    role: 'admin' | 'manager' | 'member';
    firstName: string;
    lastName: string;
}

const UserSchema: Schema = new Schema({
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'manager', 'member'], default: 'member' },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
}, { timestamps: true });

// Compound index for email to be unique probably globally or per org? 
// Usually email is unique globally in SaaS, or unique per org. 
// Let's assume global unique for login simplicity for now.
UserSchema.index({ email: 1 }, { unique: true });

export default mongoose.model<IUser>('User', UserSchema);
