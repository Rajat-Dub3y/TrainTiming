import mongoose from "mongoose"
import dotenv from "dotenv";
dotenv.config();

const connectDB=async()=>{
    try{
        const connectionInstance = await mongoose.connect(`${process.env.MONGO_URL}`)
        console.log(`\n Mongodb connected ${connectionInstance.connection.host}`)
    }catch(error){
        console.error("ERROR: ",error);
        process.exit(1)
        throw error
    }
}

export default connectDB