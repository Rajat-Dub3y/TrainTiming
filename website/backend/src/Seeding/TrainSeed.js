import dotenv from "dotenv";
import mongoose from "mongoose";
import fs from "fs";
import csvParser from "csv-parser";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";
import Train from "../models/TrainModel.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const trainsCSVPath = path.join(__dirname, "trains.csv");

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
  await mongoose.connect(process.env.MONGO_URL);
  console.log("✅ Connected to MongoDB");

  console.log("🧹 Clearing existing train data...");
  await Train.deleteMany({});
  console.log("✅ Old train data removed.");

  const trainsRaw = await loadCSV(trainsCSVPath);
  const trainsData = trainsRaw.filter(t => t.train_number?.trim());

  const failedTrains = [];
  let successCount = 0;

  for (let i = 0; i < trainsData.length; i++) {
    const train = trainsData[i];
    const trainNo = train.train_number.trim();
    let trainName = train.train_name?.trim() || "Unknown";

    let route = [];
    let RunningDays = "0000000";
    let trainType = "Memu";

    try {
      const InfoRes = await fetch(`http://localhost:3000/trains/getTrain?trainNo=${trainNo}`);
      if (!InfoRes.ok) throw new Error(`Info API returned status ${InfoRes.status}`);
      const InfoJson = await InfoRes.json();

      const RouteRes = await fetch(`http://localhost:3000/trains/getRoute?trainNo=${trainNo}`);
      if (!RouteRes.ok) throw new Error(`Route API returned status ${RouteRes.status}`);
      const RouteJson = await RouteRes.json();

      if (InfoJson?.data?.running_days) RunningDays = InfoJson.data.running_days;
      if (InfoJson?.data?.type) trainType = InfoJson.data.type;
      if (InfoJson?.data?.train_name) trainName = InfoJson.data.train_name;

      if (Array.isArray(RouteJson.data)) {
        route = RouteJson.data.map((s) => ({
          StationName: s.source_stn_name || "",
          StationCode: s.source_stn_code || "",
          ScheduledArrivalTime: formatTime(s.arrive),
          ScheduledDepartureTime: formatTime(s.depart),
          arrivalDay: parseInt(s.day) || 1,
          departureDay: parseInt(s.day) || 1,
          distance: s.distance?.toString() || "0",
        }));
      }

      if (!route.length) {
        failedTrains.push({ train: trainNo, reason: "No route found from API" });
        continue;
      }

      // Handle SPL in name
      if (trainName.toUpperCase().includes("SPL")) trainType = "Special";

      const newTrain = new Train({
        Number: trainNo,
        Name: trainName,
        Stations: route,
        RunningDays,
        trainType,
      });

      await newTrain.save();
      console.log(`✅ [${i + 1}/${trainsData.length}] Saved train ${trainNo} - ${trainName}`);
      successCount++;
    } catch (err) {
      console.warn(`❌ [${i + 1}/${trainsData.length}] Failed for train ${trainNo}:`, err.message);
      failedTrains.push({ train: trainNo, reason: err.message });
    }
  }

  console.log("\n🚂 Seeding Summary:");
  console.log(` - ✅ Trains added: ${successCount}`);
  console.log(` - ❌ Trains failed: ${failedTrains.length}`);

  if (failedTrains.length > 0) {
    console.log("\n❗ Failed Trains:");
    failedTrains.forEach(t => console.log(` - ${t.train}: ${t.reason}`));
  }

  await mongoose.disconnect();
  console.log("🔌 MongoDB disconnected after seeding.");
}

async function checkMissingTrains() {
  console.log("\n🔍 Checking for missing trains...");
  await mongoose.connect(process.env.MONGO_URL);
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
  console.log("🔌 MongoDB disconnected after check.");
}

async function readTrainNumbersFromCSV() {
  const trainsData = await loadCSV(trainsCSVPath);
  return trainsData.map(t => t.train_number?.trim()).filter(Boolean);
}

(async () => {
  try {
    await seedDatabase();
    await checkMissingTrains();
  } catch (err) {
    console.error("❌ Unhandled error:", err.message);
  } finally {
    // Cleanup if not already disconnected
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log("🔌 MongoDB force disconnected due to error.");
    }
  }
})();
