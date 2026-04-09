import { Router, type IRouter } from "express";
import healthRouter from "./health";
import anthropicRouter from "./anthropic";
import jobsRouter from "./jobs";
import notesRouter from "./notes";
import toolboxRouter from "./toolbox";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(anthropicRouter);
router.use(jobsRouter);
router.use(notesRouter);
router.use(toolboxRouter);
router.use(dashboardRouter);

export default router;
