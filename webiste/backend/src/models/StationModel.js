import mongoose from "mongoose"

const StationSchema=mongoose.Schema({
    code:{
        type:String,
        required:true,
        unique:true
    },
    number:{
        type:String,
        required:true,
        unique:true
    },
    
})