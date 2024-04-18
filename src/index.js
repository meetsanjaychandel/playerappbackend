// require('dotenv').config({path:'./.env'})
import dotenv from "dotenv"
dotenv.config({path:'./.env'});

import {app} from "./app.js";
import connectDB from "./db/db.js";

connectDB()
.then(()=>{
    app.on("Error",(error)=>{
        console.log("MongoDb connection failed ",error);
        throw error;
    });
    app.listen(process.env.PORT || 8000,()=>{
        console.log(`Server running on port : ${process.env.PORT}`);
    });
})
.catch((err)=>{
    console.log("MONGODB connection failed !!",err);
})

/*
import mongoose from "mongoose";
import { DB_NAME } from "./constants";
import express from "express";
const app = express();

(async() =>{
    try{
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        app.on("ERROR",(error)=>{
            console.log("ERROR",error);
            throw error;
        })
        app.listen(process.env.PORT,()=>{
        console.log(`App is  listening on ${process.env.PORT}`)
    });
    }
    catch(error){
        console.log("ERROR:",error);
    }
})();
*/