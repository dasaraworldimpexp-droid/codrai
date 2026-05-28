import { Router } from "express";
import { assignEmployee, createEmployee, listEmployees } from "../controllers/employee.controller.js";

const router = Router();

router.get("/", listEmployees);
router.post("/", createEmployee);
router.post("/:employeeId/assignments", assignEmployee);

export default router;
