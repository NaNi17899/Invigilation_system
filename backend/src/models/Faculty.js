import mongoose from 'mongoose'

const AvailabilitySchema = new mongoose.Schema({
  // Example: { date: '2025-11-20', slots: ['FN','AN'] } or weekly pattern
  date: { type: String },
  dayOfWeek: { type: Number, min: 0, max: 6 },
  slots: [{ type: String }], // e.g., FN, AN, EVE
}, { _id: false })

const FacultySchema = new mongoose.Schema({
  facultyId: { type: String, unique: true, sparse: true, index: true },
  name: { type: String, required: true },
  email: { type: String, unique: true, sparse: true, index: true },
  passwordHash: { type: String },
  department: { type: String, default: 'General' },
  designation: { type: String, default: 'Assistant Professor' },

  role: { type: String, enum: ['admin','faculty'], default: 'faculty' },
  availability: [AvailabilitySchema],
  maxHoursPerDay: { type: Number, default: 2 },
  weeklyCap: { type: Number, default: 10 },
  currentLoad: { type: Number, default: 0 },
  dailyLoad: { type: Map, of: Number, default: {} }, // key: date
  createdAt: { type: Date, default: Date.now },
})

export const Faculty = mongoose.model('Faculty', FacultySchema)
