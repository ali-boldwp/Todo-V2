import mongoose, { Document, Schema } from 'mongoose';

export interface IClient extends Document {
    organizationId: mongoose.Types.ObjectId;
    userId?: mongoose.Types.ObjectId;
    name: string;
    type: 'internal' | 'external';
    status: 'active' | 'suspended';
    email?: string;
    phone?: string;
    address?: string;
}

const ClientSchema: Schema = new Schema({
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true },
    type: { type: String, enum: ['internal', 'external'], default: 'external' },
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },
    email: { type: String },
    phone: { type: String },
    address: { type: String },
}, { timestamps: true });

export default mongoose.model<IClient>('Client', ClientSchema);
