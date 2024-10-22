import express from "express";
import authRouter from "./auth";
import userRouter from "./user";
const router = express.Router();

// Public routes
router.get("/hello", (_req, res) => {
    res.status(200).json({
        message: "Hello!",
    });
});

// Auth routes and middleware
router.use(authRouter);

// protected api routes
router.get("/protected", (_req, res) => {
    res.status(200).json({
        message: "Protected!",
    });
});

router.use("/user", userRouter);

export default router;
