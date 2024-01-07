import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/apiError.js";
import {User } from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import {ApiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
 
const generateAccessAndRefreshTokens= async (userId)=>{
    try {
        const user=await User.findById(userId);
        const accessToken=user.generateAccessToken();
        const refreshToken=user.generateRefreshToken();
        user.refreshToken=refreshToken;
        await user.save({validateBeforeSave:false})

        return {accessToken,refreshToken}
        
    } catch (error) {
        throw new ApiError(500,"something went wrong while generating refresh and access token")
    }
}

const registerUser=asyncHandler( async (req,res)=>{
    //get user details from frontend
    //validation - not empty
    //check if user already exixts: username and email
    //check for images, check for avatar
    //upload them to cloudinary, avatar
    //create user object - create entry in db
    //remove password and refresh token field from response
    //check for user creation
    //return response

    const {email,fullName,username,password}=req.body;
    console.log("email:",email);

    if([email,fullName,username,password].some((field)=>(field?.trim()===""))){
         throw new ApiError(400,"all fields are required");
    }

    const existingUser= await User.findOne({
        $or: [{username},{email}]
    })

    if(existingUser){
        throw new ApiError(400,"user with email or username already exists")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath=req.files?.coverImage[0]?.path;
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length >0){
        coverImageLocalPath=req.files.coverImage[0].path;
    }

    if(!avatarLocalPath){
        throw new ApiError(400,"avatar is required");
    }

    const avatar= await uploadOnCloudinary(avatarLocalPath);
    const coverImage=await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar){
        throw new ApiError(400,"avatar is required");
    }

    const user= await User.create({
        fullName,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        email,
        password,
        username:username.toLowerCase()
    })

    const createdUser=await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500,"something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200,createdUser,"user registered successfully")
    )




} )

const loginUser= asyncHandler ( async (req,res)=>{
    //req body->data
    //username or email
    //find the user
    //check password
    //generate access and refresh token
    //send cookie

    const {username,email,password}=req.body;
    if(!username && !email){
        throw new ApiError(400,"credentials are required")
    }

    const user= await User.findOne({
        $or:[{username},  {email}]
    })

    if(!user){
        throw new ApiError(400,"user does not exist")
    }

    const isPasswordValid=await user.isPasswordCorrect(password);
    if(!isPasswordValid){
        throw new ApiError(400,"password incorrect");
    }

    const {accessToken,refreshToken} = await generateAccessAndRefreshTokens(user._id);

    const loggedInUser=await User.findById(user._id).select("-password -refreshToken");
    const options={
        httpOnly:true,
        secure:true
    }

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                user:loggedInUser,
                accessToken,
                refreshToken
            },
            "user logged in successfully"
            
        )
    )



})

const logoutUser=asyncHandler ( async (req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
           $unset:{
            refreshToken:1
           }
        },
        {
            new:true
        }
    )

    const options={
        httpOnly:true,
        secure:true
    }

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(
        new ApiResponse(200,{},"user logged out")
    )
    
})

const refreshAccessToken=asyncHandler( async (req,res)=>{
    try {
        const incomingRefreshToken= req.cookie?.refreshToken || req.body.refreshToken;
        if(!incomingRefreshToken){
            throw new ApiError(400,"unauthorized request")
        }
    
        const decodedToken= jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
    
        const user=await User.findById(decodedToken._id);
        if(!user){
            throw new ApiError(400,"unauthorized request")
        }
    
        if(incomingRefreshToken !== user.refreshToken){
            throw new ApiError(400,"token expired")
        }
    
        const options={
            httpOnly:true,
            secure:true
        }
    
        const {accessToken,newRefreshToken}=await generateAccessAndRefreshTokens(user._id);
        return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",newRefreshToken,options)
        .json(
            new ApiResponse(
                200,
                {accessToken,refreshToken:newRefreshToken,},
                "access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(400,"invalid token")
    }
})

const changeCurrentPassword=asyncHandler( async (req,res)=>{

    const {oldPassword,newPassword}=req.body;
    const user=await User.findById(req.user._id);

    const isPasswordCorrect=await user.isPasswordCorrect(oldPassword)
    if(!isPasswordCorrect){
        throw new ApiError(400,"invalid credentials")
    }

    user.password=newPassword;
    await user.save({validateBeforeSave:false})

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            "password changed succesfully"
        )
    )
})

const getCurrentUser=asyncHandler( async (req,res)=>{
    return res
    .status(200)
    .json(
        new ApiResponse(200,
            req.user,
            "cureent user recieved"
            )
    )
})

const updateAccountDetails= asyncHandler(  async (req,res)=>{
    const {email, fullName} = req.body;
    if(!email || !fullName){
        throw new ApiError(400,"invalid details")
    }

    const user=await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                fullName,
                email:email
            }
        },
        {
            new:true
        }
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            "account details updated"
        )
    )    

})

const updateAvatar= asyncHandler(async (req,res)=>{
    const avatarlocalPath=req.field?.path;
    if(!avatarlocalPath){
        throw new ApiError(400,"cannot upload file");
    }

    const avatar=await uploadOnCloudinary(avatarlocalPath);
    if(!avatar.url){
        throw new ApiError(400,"cannot ipload on cloudinary")
    }

    const user=await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {
            new:true
        }
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user,
            "avatar updated successfully"
        )
    )
})

const updateUserCoverImage= asyncHandler(async (req,res)=>{
    const coverLocalImage=req.field?.path;
    if(!coverLocalImage){
        throw new ApiError(400,"cannot upload file");
    }

    const coverImage=await uploadOnCloudinary(coverLocalImage);
    if(!coverImage.url){
        throw new ApiError(400,"cannot ipload on cloudinary")
    }

    const user=await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                coverImage:coverImage.url
            }
        },
        {
            new:true
        }
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user,
            "cover image updated successfully"
        )
    )
})

const getUserChannelProfile= asyncHandler( async (req,res)=>{
    const {username} = req.params
    if(!username?.trim()){
        throw new ApiError(400,"username is missing")
    }
    const channel=await User.aggregate[
        {
            $match:{
                username:username?.toLowerCase()
            }
        },
        {
            $lookup:{
                from:"subscriptions",
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
                channelsSubscribedToCount:{
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
                subscribersCount:1,
                channelsSubscribedToCount:1,
                isSubscribed:1,
                avatar:1,
                coverImage:1,
                email:1
            }
        }
    ]
    if(!channel?.length){
        throw new ApiError(400,"channel does not exist")
    }
    console.log(channel);
    return res
    .status(200)
    .json(
        new ApiResponse(200,
            channel[0],
            "user channel etched successfully")
    )
})

const getWatchHistory=asyncHandler( async (req,res)=>{
    const user=await User.aggregate(
        [
            {
                $match:{
                    _id:new mongoose.Types.ObjectId(req.user._id)
                }
            },
            {
                $lookup:{
                    from:"videos",
                    localField:"watchHistory",
                    foreignField:"_id",
                    as:"watchHistory",
                    pipeline:[
                        {
                            $lookup:{
                                from:"users",
                                localField:"owner",
                                foreignField:"_id",
                                as:"owner",
                                pipeline:[
                                    {
                                        $project:{
                                            fullName:1,
                                            username:1,
                                            avatar:1

                                        }
                                    }
                                   
                                ]
                            }
                        },
                        {
                            $addFields:{
                                owner:{
                                    $first:"owner"
                                }
                            }
                        }
                    ]
                }
            }
        ]
    )

    return res
    .status(200)
    .json(
        new ApiResponse(200,
            user[0].watchHistory,
            "watch history fetched"
            )
    )
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}