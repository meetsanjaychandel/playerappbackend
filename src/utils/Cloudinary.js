import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
// import extractPublicId from 'cloudinary-build-url'
import { ApiError } from './ApiError.js';
          
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async(localFilePath)=>{

    try{
        if(!localFilePath) return null;
    
        const response  =  await cloudinary.uploader
        .upload(localFilePath,{resource_type:"auto"});
        // console.log("response from cloudinary",response);
        // console.log("congrats file uploaded successfully !",response.url);
        fs.unlinkSync(localFilePath);
        return response
    }
    catch(error){
        fs.unlinkSync(localFilePath);
        return null;
    }  
}

/*const deleteOldAvatarOnCloudinary = async(avatarUrl)=>{
    
    try {
        const publicId  = await extractPublicId(avatarUrl)
        await cloudinary.uploader.destroy(publicId);

    } catch (error) {
        throw new ApiError(400,"Old Avatar on Cloudinary deletion failed")
    }
} */

export {uploadOnCloudinary};