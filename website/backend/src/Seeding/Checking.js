import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import csvParser from "csv-parser";
import { fileURLToPath } from "url";
import Train from "../models/TrainModel.js"; // adjust path if needed

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const csvPath = path.join(__dirname, "trains.csv");

const connectToMongo = async () => {
  try {
    await mongoose.connect("mongodb://localhost:27017/trainML");
    console.log("✅ Connected to MongoDB");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  }
};

const readTrainNumbersFromCSV = () => {
  return new Promise((resolve, reject) => {
    const trains = [];
    fs.createReadStream(csvPath)
      .pipe(csvParser())
      .on("data", (row) => {
        if (row.train_number) {
          trains.push(row.train_number.trim());
        }
      })
      .on("end", () => resolve(trains))
      .on("error", reject);
  });
};

const checkMissingTrains = async () => {
  await connectToMongo();
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

  mongoose.connection.close();
};

checkMissingTrains();
