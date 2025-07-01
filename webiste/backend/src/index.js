import express from "express"
import dotenv from "dotenv"

dotenv.config()

const app=express()

const port=process.env.PORT

app.use(express.json())
app.use(cookieParser())
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);


app.listen(port,()=>{
    console.log(`Server is running on port ${port}`)
})