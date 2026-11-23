import type { NextFunction, Response } from 'express';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import type { TaskPriority } from '../models/task.model.js';
import * as taskService from '../services/task.service.js';

export async function createTask(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const task = await taskService.createTask(req.user!.userId, req.body);
    res.status(201).json({
      message: 'Task created successfully',
      task,
    });
  } catch (err) {
    next(err);
  }
}

export async function listTasks(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const isCompletedParam = req.query.isCompleted;
    const isCompleted =
      isCompletedParam === 'true' ? true : isCompletedParam === 'false' ? false : undefined;

    const tasks = await taskService.listTasks(req.user!.userId, {
      projectId: req.query.projectId ? String(req.query.projectId) : undefined,
      priority: req.query.priority ? (String(req.query.priority) as TaskPriority) : undefined,
      isCompleted,
      due: req.query.due
        ? (String(req.query.due) as 'today' | 'tomorrow' | 'upcoming')
        : undefined,
      sort: req.query.sort ? (String(req.query.sort) as 'default' | 'priority') : undefined,
    });

    res.status(200).json({ tasks });
  } catch (err) {
    next(err);
  }
}

export async function getTaskById(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const task = await taskService.getTaskById(req.user!.userId, String(req.params.id));
    res.status(200).json({ task });
  } catch (err) {
    next(err);
  }
}

export async function updateTask(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const task = await taskService.updateTask(req.user!.userId, String(req.params.id), req.body);
    res.status(200).json({
      message: 'Task updated successfully',
      task,
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteTask(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await taskService.deleteTask(req.user!.userId, String(req.params.id));
    res.status(200).json({
      message: 'Task deleted successfully',
    });
  } catch (err) {
    next(err);
  }
}

export async function toggleTaskCompletion(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const task = await taskService.toggleTaskCompletion(
      req.user!.userId,
      String(req.params.id)
    );
    res.status(200).json({
      message: task.isCompleted ? 'Task marked as done' : 'Task moved back to active',
      task,
    });
  } catch (err) {
    next(err);
  }
}
