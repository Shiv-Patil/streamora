import express from "express";
import profileRouter from "./profile";
import feedRouter from "./feed";
import followRouter from "./follow";
import unfollowRouter from "./unfollow";

const router = express.Router();

router.use("/profile", profileRouter);
router.use("/feed", feedRouter);
router.use("/follow", followRouter);
router.use("/unfollow", unfollowRouter);

export default router;
