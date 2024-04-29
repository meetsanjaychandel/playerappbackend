import { Router } from "express";
import {upload} from "../middlewares/multer.middlewares.js"
import { registerUser,loginUser,logoutUser,refreshAccessToken } from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(upload.fields([
    {
        name:"avatar",
        maxCount:1},
    {
        name:"coverImage",
        maxCount:1
    }

    //write a route for login user.
    
]),registerUser);

// router.route("/avd").get(controller method name)

router.route("/login").post(loginUser)

//secured routes(rights to logged in user)
router.route("/logout").post(verifyJWT,logoutUser)
router.route("/refresh-token").post(refreshAccessToken);

export default router;