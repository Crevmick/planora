import type { NextFunction, Response } from 'express';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import * as projectService from '../services/project.service.js';

export async function createProject(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const project = await projectService.createProject(req.user!.userId, req.body);
    res.status(201).json({
      message: 'Project created successfully',
      project,
    });
  } catch (err) {
    next(err);
  }
}

export async function listProjects(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const projects = await projectService.listProjects(req.user!.userId);
    res.status(200).json({ projects });
  } catch (err) {
    next(err);
  }
}

export async function getProjectById(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const project = await projectService.getProjectById(
      req.user!.userId,
      String(req.params.id)
    );
    res.status(200).json({ project });
  } catch (err) {
    next(err);
  }
}

export async function updateProject(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const project = await projectService.updateProject(
      req.user!.userId,
      String(req.params.id),
      req.body
    );
    res.status(200).json({
      message: 'Project updated successfully',
      project,
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteProject(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await projectService.deleteProject(req.user!.userId, String(req.params.id));
    res.status(200).json({
      message: 'Project deleted successfully',
    });
  } catch (err) {
    next(err);
  }
}
