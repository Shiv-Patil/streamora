import express from "express";
import startRouter from "./start";
import endRouter from "./end";

const router = express.Router();

router.use("/start", startRouter);
router.use("/end", endRouter);

export default router;
