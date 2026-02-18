import mongoose, { Document, Schema } from 'mongoose';

export interface IOrganization extends Document {
    name: string;
    plan: 'free' | 'pro' | 'enterprise';
    createdAt: Date;
    updatedAt: Date;
}

const OrganizationSchema: Schema = new Schema({
    name: { type: String, required: true },
    plan: { type: String, enum: ['free', 'pro', 'enterprise'], default: 'free' },
}, { timestamps: true });

export default mongoose.model<IOrganization>('Organization', OrganizationSchema);
