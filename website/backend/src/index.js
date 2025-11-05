import express from "express"
import dotenv from "dotenv"
import connectDB from "./utils/ConnectDB.js"

import cookieParser from "cookie-parser"
import cors from "cors"

import RouteRuter from "./routes/RouteRouter.js"
import TrainRoute from "./routes/TrainRouter.js"


dotenv.config()


connectDB()

const app=express()

const port=process.env.PORT

app.use(express.json())

app.use(cookieParser())

//app.use(
//  cors({
//    origin: "http://localhost:5173",
//    credentials: true,
//  })
//);


// Routes

app.get("",(req,res)=>{
  res.send("Hello world")
})


app.use("/api/route",RouteRuter)

app.use("/api/train",TrainRoute)

// Listen

app.listen(port,()=>{
    console.log(`Server is running on port ${port}`)
})