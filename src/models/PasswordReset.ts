import mongoose, { Schema, Document } from 'mongoose';

export interface IPasswordReset extends Document {
    pilot_id: mongoose.Types.ObjectId;
    token: string;
    expires_at: Date;
    used_at?: Date;
    created_at: Date;
}

const PasswordResetSchema = new Schema<IPasswordReset>({
    pilot_id: { type: Schema.Types.ObjectId, ref: 'Pilot', required: true, index: true },
    token: { type: String, required: true, unique: true, index: true },
    expires_at: { type: Date, required: true },
    used_at: Date,
    created_at: { type: Date, default: Date.now },
});

PasswordResetSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

const PasswordReset = mongoose.models.PasswordReset || mongoose.model<IPasswordReset>('PasswordReset', PasswordResetSchema);
export default PasswordReset;
