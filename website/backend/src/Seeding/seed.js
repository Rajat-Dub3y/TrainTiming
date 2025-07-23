import mongoose from "mongoose";
import fs from "fs";
import csvParser from "csv-parser";
import path from "path";
import fetch from "node-fetch";
import Train from "../models/TrainModel.js";

const trainsCSVPath = path.resolve("./website/backend/src/Seeding/trains.csv");
const trainScheduleCSVPath = path.resolve("./website/backend/src/Seeding/trainsschedule.csv");

function formatTime(timeStr) {
  if (!timeStr) return "00:00";
  const parts = timeStr.split(":");
  if (parts.length < 2) return "00:00";
  const [hh, mm] = parts;
  return `${hh.padStart(2, "0")}:${mm.padStart(2, "0")}`;
}

async function loadCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on("data", (data) => results.push(data))
      .on("end", () => resolve(results))
      .on("error", (err) => reject(err));
  });
}

async function seedDatabase() {
  console.log("📡 Connecting to MongoDB...");
  await mongoose.connect("mongodb://127.0.0.1:27017/train_db");
  console.log("✅ Connected to MongoDB");

  const trainsData = await loadCSV(trainsCSVPath);
  const scheduleData = await loadCSV(trainScheduleCSVPath);

  const scheduleMap = new Map();
  for (const row of scheduleData) {
    const trainNo = row.train_number?.trim();
    if (!trainNo) continue;
    if (!scheduleMap.has(trainNo)) scheduleMap.set(trainNo, []);
    scheduleMap.get(trainNo).push({
      StationName: row.station_name || "",
      StationCode: row.station_code || "",
      ScheduledArrivalTime: formatTime(row.arrival),
      ScheduledDepartureTime: formatTime(row.departure),
      arrivalDay: parseInt(row.day) || 1,
      departureDay: parseInt(row.day) || 1,
      distance: "0",
    });
  }

  console.log("🧹 Clearing existing train data...");
  await Train.deleteMany({});
  console.log("✅ Old train data removed.");

  const failedTrains = [];
  let successCount = 0;

  for (const train of trainsData) {
    const trainNo = train.train_number?.trim();
    const trainName = train.train_name?.trim();

    if (!trainNo || !trainName) {
      failedTrains.push({ train: trainNo, reason: "Missing train number or name" });
      continue;
    }

    let route = [];
    let RunningDays = "0000000";
    let trainType = "Menu";

    try {
      const res = await fetch(`http://localhost:3000/trains/getTrain?trainNo=${trainNo}`);
      const json = await res.json();

      if (Array.isArray(json)) {
        route = json.map((s) => ({
          StationName: s.source_stn_name || "",
          StationCode: s.source_stn_code || "",
          ScheduledArrivalTime: formatTime(s.arrive),
          ScheduledDepartureTime: formatTime(s.depart),
          arrivalDay: parseInt(s.day) || 1,
          departureDay: parseInt(s.day) || 1,
          distance: s.distance?.toString() || "0",
        }));
      } else {
        if (json?.route) {
          route = json.route.map((s) => ({
            StationName: s.source_stn_name || "",
            StationCode: s.source_stn_code || "",
            ScheduledArrivalTime: formatTime(s.arrive),
            ScheduledDepartureTime: formatTime(s.depart),
            arrivalDay: parseInt(s.day) || 1,
            departureDay: parseInt(s.day) || 1,
            distance: s.distance?.toString() || "0",
          }));
        }
        if (json?.RunningDays) RunningDays = json.RunningDays;
        if (json?.trainType) trainType = json.trainType;
      }
    } catch (err) {
      console.warn(`⚠️ API error for ${trainNo}:`, err.message);
    }

    if (!route.length) {
      const fallback = scheduleMap.get(trainNo);
      if (fallback) {
        route = fallback.map((s) => ({ ...s }));
      }
    }

    if (!route.length) {
      failedTrains.push({ train: trainNo, reason: "No route found in API or CSV" });
      continue;
    }

    try {
      const newTrain = new Train({
        Number: trainNo,
        Name: trainName,
        Stations: route,
        RunningDays,
        trainType,
      });

      await newTrain.save();
      console.log(`✅ Saved train ${trainNo} - ${trainName}`);
      successCount++;
    } catch (err) {
      console.error(`❌ Failed to save train ${trainNo}: ${err.message}`);
      failedTrains.push({ train: trainNo, reason: err.message });
    }
  }

  console.log("\n🚂 Seeding Summary:");
  console.log(` - ✅ Trains added: ${successCount}`);
  console.log(` - ❌ Trains failed: ${failedTrains.length}`);

  if (failedTrains.length > 0) {
    console.log("\n❗ Failed Trains:");
    failedTrains.forEach(t => {
      console.log(` - ${t.train}: ${t.reason}`);
    });
  }

  await mongoose.disconnect();
  console.log("\n🔌 Disconnected from MongoDB. Done.");
}

// Helper: Read train numbers from trains.csv
async function readTrainNumbersFromCSV() {
  const trainsData = await loadCSV(trainsCSVPath);
  return trainsData.map(t => t.train_number?.trim()).filter(Boolean);
}

// Run missing train checker
async function checkMissingTrains() {
  console.log("\n🔍 Checking for missing trains...");
  await mongoose.connect("mongodb://127.0.0.1:27017/train_db");
  const csvTrainNumbers = await readTrainNumbersFromCSV();
  const existingTrains = await Train.find({}, { Number: 1, _id: 0 }).lean();

  const existingSet = new Set(existingTrains.map((t) => t.Number));
  const missingTrains = csvTrainNumbers.filter((num) => !existingSet.has(num));

  console.log(`📊 Total trains in CSV: ${csvTrainNumbers.length}`);
  console.log(`✅ Trains in DB: ${csvTrainNumbers.length - missingTrains.length}`);
  console.log(`❌ Missing trains in DB: ${missingTrains.length}`);
  if (missingTrains.length > 0) {
    console.log("List of missing train numbers:");
    console.log(missingTrains.join(", "));
  }

  await mongoose.disconnect();
}

// Run both operations
(async () => {
  try {
    await seedDatabase();
    await checkMissingTrains();
  } catch (err) {
    console.error("❌ Unhandled error:", err.message);
    await mongoose.disconnect();
  }
})();
