import mongoose from "mongoose";

const trainHistorySchema = new mongoose.Schema({
  train: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Train",
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  actualArrival: {
    type: String,
    match: /^([01]\d|2[0-3]):([0-5]\d)$/,
    required: true
  },
  actualDeparture: {
    type: String,
    match: /^([01]\d|2[0-3]):([0-5]\d)$/,
    required: true
  },
  delayMinutes: {
    type: Number,
    default: 0
  },
  remarks: {
    type: String
  }
}, { timestamps: true });

const TrainHistory = mongoose.model("TrainHistory", trainHistorySchema);
export default TrainHistory;
