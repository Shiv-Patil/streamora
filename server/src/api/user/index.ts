import express from "express";
import profileRouter from "./profile";

const router = express.Router();

router.use("/profile", profileRouter);

export default router;
