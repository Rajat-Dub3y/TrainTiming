import axios from "axios";
import dotenv from "dotenv";
import asynchandler from "../utils/asynchandler.js";


dotenv.config()


const apikey=process.env.RAILAPIKEY


export  const directTrains=asynchandler(async(req,res)=>{
    const {Source,Destination} =req.body;

    
    const response=await axios.get(`http://localhost:3000/trains/getTrain/?trainNo=22137`)

    res.status(200).json(response.data)

})
