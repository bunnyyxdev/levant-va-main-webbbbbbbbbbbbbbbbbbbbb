import mongoose, { Schema, Document } from 'mongoose';

export interface IEventBooking extends Document {
    event_id: mongoose.Types.ObjectId;
    pilot_id: mongoose.Types.ObjectId;
    booked_at: Date;
    status: 'Booked' | 'Attended' | 'Cancelled';
}

const EventBookingSchema = new Schema<IEventBooking>({
    event_id: { type: Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    pilot_id: { type: Schema.Types.ObjectId, ref: 'Pilot', required: true, index: true },
    booked_at: { type: Date, default: Date.now },
    status: { type: String, enum: ['Booked', 'Attended', 'Cancelled'], default: 'Booked', index: true },
});

EventBookingSchema.index({ event_id: 1, pilot_id: 1 }, { unique: true });

const EventBooking = mongoose.models.EventBooking || mongoose.model<IEventBooking>('EventBooking', EventBookingSchema);
export default EventBooking;
