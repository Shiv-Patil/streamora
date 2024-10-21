import express from "express";
import authRouter from "./auth";
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

export default router;
