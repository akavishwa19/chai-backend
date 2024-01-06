import { Router } from "express";
import { registerUser,loginUser, logoutUser,refreshAccessToken,changeCurrentPassword,getCurrentUser,updateAccountDetails,updateAvatar,updateUserCoverImage,getUserChannelProfile,getWatchHistory } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
    upload.fields([
        {
            name:"avatar",
            maxCount:1
        },
        {
            name:"coverImage",
            maxCount:1
        }
    ]),
    registerUser
)

router.route("/login").post(loginUser)

router.route("/logout").post(verifyJWT,logoutUser)

router.route("/refreshAccessToken").post(refreshAccessToken)

router.route("/changeCurrentPassword").post(verifyJWT,changeCurrentPassword)

router.route("/getCurrentUser").get(verifyJWT,getCurrentUser)

router.route("/updateAccountDetails").post(verifyJWT,updateAccountDetails)

router.route("/updateAvatar").post(verifyJWT,updateAvatar)

router.route("/updateUserCoverImage").post(verifyJWT,updateUserCoverImage)

router.route("/getUserChannelProfile").get(verifyJWT,getUserChannelProfile)

router.route("/getWatchHistory").post(verifyJWT,getWatchHistory)



export default router;