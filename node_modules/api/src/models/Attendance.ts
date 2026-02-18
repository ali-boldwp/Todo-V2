import mongoose, { Document, Schema } from 'mongoose';

export interface IAttendance extends Document {
    organizationId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    date: Date; // Normalized to start of day
    checkInTime?: Date;
    checkOutTime?: Date;
    duration?: number; // minutes
    status: 'present' | 'absent' | 'late' | 'half_day';
    notes?: string;
}

const AttendanceSchema: Schema = new Schema({
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: Date, required: true },
    checkInTime: { type: Date },
    checkOutTime: { type: Date },
    duration: { type: Number },
    status: { type: String, enum: ['present', 'absent', 'late', 'half_day'], default: 'present' },
    notes: { type: String },
}, { timestamps: true });

// Compound index to prevent multiple records for same user on same day (if checking in/out multiple times is not allowed via multiple docs)
// Usually attendance is one doc per day with checkin/checkout.
AttendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.model<IAttendance>('Attendance', AttendanceSchema);
