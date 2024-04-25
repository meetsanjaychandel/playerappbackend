import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/Cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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
    const existingUser = User.findOne({
        $or: [{username},{email}]
    })
    if(existingUser){
        throw new ApiError(409,"User already exists !")
    }
    const avatarLocalPath = req.files?.avatar[0]?.path;
    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar is required !")
    }
    const coverImageLocalPath = req.files?.coverImage[0]?.path;
    if(!coverImageLocalPath){
        throw new ApiError(404,"coverImage is required !")
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath);
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

export {registerUser}