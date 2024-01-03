
// import express from "express";
// const app=express();
// require('dotenv').config()
import app from './app.js'
import connectDB from "./db/index.js";
import dotenv from "dotenv";
dotenv.config();


connectDB()
.then(()=>{
    app.listen(process.env.PORT || 8000,()=>{
        console.log('server running on http://localhost:'+process.env.PORT || 8000);
    })
})
.catch((err)=>{
    console.log('mongo connection error',err);
});


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