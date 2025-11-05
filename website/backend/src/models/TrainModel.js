import mongoose from "mongoose";

const stationStopSchema = new mongoose.Schema({
  StationName: {
    type: String,
    required: true
  },
  StationCode: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  distance: {
    type: String,
    default: "0"
  },
  arrivalDay: {
    type: Number,
    default: 1
  },
  ScheduledArrivalTime: {
    type: String,
    required: true,
    match: /^([01]\d|2[0-3]):([0-5]\d)$/ // HH:mm format
  },
  departureDay: {
    type: Number,
    default: 1
  },
  ScheduledDepartureTime: {
    type: String,
    required: true,
    match: /^([01]\d|2[0-3]):([0-5]\d)$/ // HH:mm format
  }
});

const trainSchema = new mongoose.Schema({
  Number: {
    type: String,
    required: true,
    unique: true
  },
  Name: {
    type: String,
    required: true
  },
  RunningDays: {
    type: String,
    validate: {
      validator: (v) => /^[01]{7}$/.test(v),
      message: (props) => `${props.value} is not a valid 7-character binary string`
    }
  },
  Stations: [stationStopSchema],
  trainType: {
    type: String,
    enum: ["Express", "Passenger", "Superfast", "Special", "Menu"]
  }
});

const Train = mongoose.model("Train", trainSchema);

export default Train;
