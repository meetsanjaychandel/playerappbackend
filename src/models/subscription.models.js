import mongoose, { Schema } from 'mongoose';

const subscriptionSchema = new Schema({
    subscriber:{
        type:Schema.Types.ObjectId, //subscriber is also a user.
        ref:"User"
    },
    channel:{
        //channel is also a user to whom subscriber is subscribing.
        type:Schema.Types.ObjectId, //subscriber is also a user.
        ref:"User"
    }
},{timestamps:true})

export const Subscription = new mongoose.model("Subscription",subscriptionSchema)