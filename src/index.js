
// import express from "express";
// const app=express();
import connectDB from "./db/index.js";
// require('dotenv').config()
import dotenv from "dotenv";
dotenv.config();


connectDB();


/*
;( async ()=>{
    try {
       await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
       app.on("error",(error)=>{
        console.log("ERROR",error);
        throw error;
       })

       app.listen(process.env.PORT,()=>{
        console.log(`server is running on http://localhost${process.env.PORT}`)
       })
    } 
    catch (error) {
        console.log('ERROR',error);
        throw error;
    }
})()

*/