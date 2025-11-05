import express from "express"
import { getDirectTrain , getIndirectTrains} from "../controllers/TrainRouteController.js"

const route=express.Router()

route.post("/directtrain",getDirectTrain)
route.post("/indirecttrain",getIndirectTrains)

export default route