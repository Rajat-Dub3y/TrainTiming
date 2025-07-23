import mongoose from "mongoose"

const StationSchema=mongoose.Schema({
    Code:{
        type:String,
        required:true,
        unique:true
    },
    Name:{
        type:String,
        required:true,
        unique:true
    },
    Trains:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Train"
    }],
    busyRating: {
    type: [Number],
    validate: {
      validator: function (arr) {
        return arr.length === 24;
      },
      message: "busyRating must contain exactly 24 hourly values"
    },
    required: true
  }
})