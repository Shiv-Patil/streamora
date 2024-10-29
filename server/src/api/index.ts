import express from "express";
import channelRouter from "./channel";
import authRouter from "./auth";
import userRouter from "./user";
import streamRouter from "./stream";

const router = express.Router();

// Public routes
router.get("/hello", (_req, res) => {
    res.status(200).json({
        message: "Hello!",
    });
});

router.use("/channel", channelRouter);

// Auth routes and middleware
router.use(authRouter);

// protected api routes
router.get("/protected", (_req, res) => {
    res.status(200).json({
        message: "Protected!",
    });
});

router.use("/user", userRouter);
router.use("/stream", streamRouter);

export default router;
