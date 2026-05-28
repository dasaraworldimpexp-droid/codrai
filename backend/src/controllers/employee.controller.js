export async function createEmployee(req, res, next) {
  try {
    const employee = await req.app.locals.aiEmployeeService.create({
      ...req.body,
      workspaceId: req.workspace?.id || req.body.workspaceId,
      userId: req.user?.id || req.body.userId,
    });
    return res.status(201).json({ employee });
  } catch (error) {
    return next(error);
  }
}

export async function listEmployees(req, res, next) {
  try {
    const employees = await req.app.locals.aiEmployeeService.list({
      workspaceId: req.workspace?.id || req.query.workspaceId,
      limit: Number(req.query.limit || 50),
    });
    return res.status(200).json({ employees });
  } catch (error) {
    return next(error);
  }
}

export async function assignEmployee(req, res, next) {
  try {
    const result = await req.app.locals.aiEmployeeService.assign({
      id: req.params.employeeId,
      workspaceId: req.workspace?.id || req.body.workspaceId,
      projectId: req.body.projectId,
      userId: req.user?.id || req.body.userId,
      objective: req.body.objective,
    });
    return res.status(202).json(result);
  } catch (error) {
    return next(error);
  }
}
