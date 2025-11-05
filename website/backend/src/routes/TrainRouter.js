import express from "express";
import { getTrainInfo } from "../controllers/TrainInfoController.js";

const route=express.Router()

route.get("/trainNo/:trainNo",getTrainInfo)

export default route