import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/Cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessTokenAndRefreshToken = async (userId)=>{
    try{
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
       
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave:false});
        
        return {accessToken,refreshToken}

    }
    catch(error){
        throw new ApiError(500,"can't generate access/refresh token")
    }
}

const registerUser = asyncHandler( async(req,res)=>{
    //take user data
    //check for the required details like username and password
    //check  if the user is already present 
    //check for avatar and coverimages
    //if files are present then upload to cloudinary.
    //on cloudinary,checck for avatar.
    //if present then create user obj and create entry in db.
    //remove password and refresh token from response.
    //check for user creation and return the res.

    const {fullName,email,username,password} = req.body;
    // if(fullName===""){
    //     throw new ApiError(400,"please fill fullname",)
    // } 
    if([fullName,email,username,password]
        .some((field) =>field?.trim()==="")){
            throw new ApiError(400,"all fields are required !")
        }
    const existingUser = await User.findOne({
        $or: [{username},{email}]
    })
    if(existingUser){
        throw new ApiError(409,"User already exists !")
    }
    const avatarLocalPath = req.files?.avatar[0]?.path;

    // console.log("avatar path:",avatarLocalPath);
    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar localFilePath is missing !")
    }
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) 
    && req.files.coverImage.length>0){
        coverImageLocalPath = req.files.coverImage[0].path
    }
    // if(!coverImageLocalPath){
    //     throw new ApiError(404,"coverImage localFilePath is missing !")
    // }
    const avatar =   await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar){
        throw new ApiError(400,"Avatar is required !")
    }
    const user  = await User.create({
        fullName,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        email,
        password,
        username:username.toLowerCase()
    })
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if(!createdUser){
        throw new ApiError("User registration failed !")
    }
    return res.status(201).json(
        new ApiResponse(200,createdUser,"User registration successful !")
    )
    
    
} )

const loginUser = asyncHandler(async(req,res)=>{
    //check if the email,username exists in db,if not exists then error
    //if exists match the password with db password for that email.
    //generate access and refresh token.
    //send cookies
    const {email,password,username} = req.body;
    if(!(username || email)){
        throw new ApiError(400,"username or email is required !")
    }
    const existingUser = await User.findOne({$or:[{email},{username}]});
    if(!existingUser){
        throw new ApiError(404,"User doesn't exists !");
    }

    // const matchedpassword  = await bcrypt.compare(password,existingUser.password);
    const isPasswordValid = await existingUser.isPasswordCorrect(password)
    if(!isPasswordValid){
        throw new ApiError(401,"please enter correct password")
    }
    const {accessToken,refreshToken} = await generateAccessTokenAndRefreshToken(existingUser._id);

    const loggedInUser = await User.findById(existingUser._id)
    .select("-password -refreshToken");

    const options ={
        httpOnly:true,
        secure : true
    }

    return res.status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(new ApiResponse(200,{
        user:loggedInUser,accessToken,refreshToken},
        "logged in successfully !",
    ))

})

const logoutUser = asyncHandler(async (req,res)=>{
    await User.findByIdAndUpdate(req.user._id,
        {
            $unset:{
                // refreshToken:undefined
                refreshToken:1
            }
        },
        {
            new:true
        }
    )
    const options = {
        httpOnly:true,
        secure:true
    }
    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"user logged out !"))
})

const refreshAccessToken = asyncHandler(async(req,res)=>{
    //we get an error that accessToken expired
    //then we call generate user accessToken. only when 
    //db refreshToken matches with user refreshtoken.

    const incomingRefreshToken = req.cookies.refreshToken || 
    req.body.refreshToken;

    if(!incomingRefreshToken){
        throw new ApiError(401,"Unauthorized Request !");
    }

    try{
        const decodedToken = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET);
        
        const user = await User.findById(decodedToken?._id);
        if(!user){
            throw new ApiError(401,"Invalid refresh Token!")
        }

        if(user?.refreshToken !== incomingRefreshToken){
            throw new ApiError(401,"refresh Token Expired")
        }

        const options={
            httpOnly:true,
            secure:true
        }

        const {accessToken,refreshToken} = await generateAccessTokenAndRefreshToken(user._id);
        
        return res.status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",refreshToken,options)
        .json(
            new ApiResponse(
                200,
                {accessToken,refreshToken:refreshToken},
                "Access Token Refreshed !"
            )
        )

    }
    catch(error){
        throw new ApiError(401,error?.message||"Invalid refresh token")
    }

})

const changeCurrentPassword = asyncHandler(async(req,res)=>{
    //take old n new password from req.body, 
    // by injecting a auth middleware,we take user from db.
    //if the old password matches with db update the new password in db.
    const {oldPassword,newPassword} = req.body
    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
    if(!isPasswordCorrect){
        throw new ApiError(400,"password doesn't match")
    }
    user.password = newPassword;
    await user.save({validateBeforeSave:false})

    return res.status(200)
    .json(new ApiResponse(200,{},"password changed successfully !"))

})

const getCurrentUser = asyncHandler(async(req,res)=>{
    //authmiddleware will give req.user
    return res
    .status(200)
    .json(new ApiResponse(200,req.user,"current user fetched"))
})

const updateAccountDetails = asyncHandler(async(req,res)=>{
    const {fullName,email} = req.body;
    if(!(fullName || email)){
        throw new ApiError(400,"please fill the details to be updated !")
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {$set:{fullName:fullName,email}},
        {new:true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200,user,"Details updated successfully !")
    )
})

const updateUserAvatar = asyncHandler(async(req,res)=>{
    //take the new uploaded file from multer middleware
    //upload avatar url on cloudinary.
    const avatarLocalPath = req.file?.path
    if(!avatarLocalPath){
        throw new ApiError(400,"please upload the avatar")
    }

    //delete old avatar on cloudinary
    // const oldAvatarUrl = await User.findById(req._id).select("avatar")
    // await deleteOldAvatarOnCloudinary(oldAvatarUrl)

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if(!avatar.url){
        throw new ApiError(400,"upload on cloudinary failed")
    }
    const user = await User.findByIdAndUpdate(req.user._id,
    {$set:{
        avatar:avatar.url
    }},
    {new:true}
    ).select("-password ")

    return res.
    status(200)
    .json(
        new ApiResponse(200,user,"avatar updated successfully")
    )

})

const updateUserCoverImage = asyncHandler(async(req,res)=>{
    //take the new uploaded file from multer middleware
    //upload avatar url on cloudinary.
    const coverImageLocalPath = req.file?.path
    if(!coverImageLocalPath){
        throw new ApiError(400,"please upload the new CoverImage")
    }
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if(!coverImage.url){
        throw new ApiError(400,"upload on cloudinary failed")
    }
    const user = await User.findByIdAndUpdate(req.user._id,
    {$set:{
        coverImage:coverImage.url
    }},
    {new:true}
    ).select("-password ")

    return res.
    status(200)
    .json(
        new ApiResponse(200,user,"coverImage updated successfully")
    )

})

const getUserChannelProfile = asyncHandler(async(req,res)=>{
    const {username} = req.params;

    if(!username.trim()){
        throw new ApiError(400,"No username found")
    }
    // User.find(username)
    const channel = await User.aggregate([{
        $match:{
            username:username?.toLowerCase()
        }
    },
    {
        $lookup:{
            from: "subscriptions",
            localField:"_id",
            foreignField:"channel",
            as:"subscribers"
        }
    },
    {
        $lookup:{
            from:"subscriptions",
            localField:"_id",
            foreignField:"subscriber",
            as:"subscribedTo"
        }
    },
    {
        $addFields:{
            subscribersCount:{
                $size:"$subscribers"
            },
            channelSubcribedToCount:{
                $size:"$subscribedTo"
            },
            isSubscribed:{
                $cond:{
                    if:{$in:[req.user?._id,"$subscribers.subscriber"]},
                    then:true,
                    else:false
                }
            }
        }
    },
    {
        $project:{
            fullName:1,
            username:1,
            coverImage:1,
            avatar:1,
            subscribersCount:1,
            channelSubcribedToCount:1,
            isSubscribed:1,
            email:1
        }
    }

    ])

    if(!channel?.length){
        throw new ApiError(404,"no such channel exists")
    }
    return res
    .status(200)
    .json(
        new ApiResponse(200,channel[0],"User channel fetched successfully")
    )

})

const getWatchHistory = asyncHandler(async(req,res)=>{
    const user = await User.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"watchHistory",
                foreignField:"_id",
                as:"watchHistory",
                pipeline:[{
                    $lookup:{
                        from:"users",
                        localField:"owner",
                        foreignField:"_id",
                        as:"owner",
                        pipeline:[{
                            $project:{
                                username:1,
                                fullName:1,
                                avatar:1
                            }
                        }]

                    }
                },{
                    $addFields:{
                        owner:{
                            $first:"$owner"
                        }
                    }
                }]
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(200,user[0].watchHistory,"watchHistory fetched successfully")
    )
})

export {registerUser,loginUser,logoutUser,refreshAccessToken,
    changeCurrentPassword,getCurrentUser,updateAccountDetails,
    updateUserAvatar,updateUserCoverImage,getUserChannelProfile,
    getWatchHistory

}