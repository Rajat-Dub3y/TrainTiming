import mongoose from "mongoose"

const StationSchema=mongoose.Schema({
    Code:{
        type:String,
        required:true,
        unique:true
    },
    Name:{
        type:String,
        required:true
    },
    Zone:{
      type:String,
      required:true
    },
    Address:{
      type:String
    },
    Trains:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Train"
    }],
    busyRating: {
    type: [Number],
    validate: {
      validator: function (arr) {
        return arr.length===0 || arr.length === 24;
      },
      message: "busyRating must contain exactly 24 hourly values"
    }
  }
})

const Station = mongoose.model("Station",StationSchema)

export default Station