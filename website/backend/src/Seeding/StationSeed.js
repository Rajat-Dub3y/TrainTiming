import dotenv from "dotenv";
import mongoose from "mongoose";
import fs from "fs";
import csvParser from "csv-parser";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";
import Train from "../models/TrainModel.js";
import Station from "../models/StationModel.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const stationCSVPath = path.join(__dirname, "stations.csv");

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

const seedDatabase=async()=>{
  console.log("📡 Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGO_URL);
  console.log("✅ Connected to MongoDB");

  console.log("🧹 Clearing existing train data...");
  await Station.deleteMany({});
  console.log("✅ Old station data removed.");

  const stationRaw = await loadCSV(stationCSVPath);
  const stationData = stationRaw.filter(s => s.Code?.trim());

  const failedStation = [];
  let successCount = 0;

  for(let i=0;i<stationData.length;i++){
    const station=stationData[i];
    let stationCode=station.Code.trim() ;
    let stationName=station.Name.trim();
    let stationZone=station.Zone.trim();
    let stationAddress=station.Address.trim();
    const newStation=new Station({
      Code:stationCode,
      Name:stationName,
      Zone:stationZone,
      Address:stationAddress
    })
    await newStation.save();
    console.log(`${stationCode} added`)
  }
}
seedDatabase()