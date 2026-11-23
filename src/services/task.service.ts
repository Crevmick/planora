import mongoose from 'mongoose';
import { Project } from '../models/project.model.js';
import { Task, type ITask, type TaskPriority } from '../models/task.model.js';
import { AppError } from '../utils/AppError.js';

export interface CreateTaskInput {
  title: string;
  projectId?: string | null;
  dueDate?: string | null;
  dueTime?: string | null;
  priority?: TaskPriority;
}

export interface UpdateTaskInput {
  title?: string;
  projectId?: string | null;
  dueDate?: string | null;
  dueTime?: string | null;
  priority?: TaskPriority;
  isCompleted?: boolean;
}

export interface ListTasksFilter {
  projectId?: string;
  priority?: TaskPriority;
  isCompleted?: boolean;
  due?: 'today' | 'tomorrow' | 'upcoming';
  sort?: 'default' | 'priority';
}

export interface TaskProjectSummary {
  _id: string;
  name: string;
  color: string;
}

export type TaskResponse = ReturnType<ITask['toJSON']> & {
  title: string;
  priority: TaskPriority;
  isCompleted: boolean;
  dueDate?: Date;
  dueTime?: string;
  completedAt?: Date;
  project?: TaskProjectSummary | null;
};

const PRIORITY_RANK: Record<TaskPriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

async function attachProjects(tasks: ITask[]): Promise<TaskResponse[]> {
  const projectIds = [
    ...new Set(
      tasks
        .map((t) => t.projectId?.toString())
        .filter((id): id is string => Boolean(id))
    ),
  ];

  const projectMap = new Map<string, TaskProjectSummary>();
  if (projectIds.length > 0) {
    const projects = await Project.find({ _id: { $in: projectIds } })
      .select('name color')
      .lean();
    for (const p of projects) {
      projectMap.set(p._id.toString(), {
        _id: p._id.toString(),
        name: p.name,
        color: p.color,
      });
    }
  }

  return tasks.map((task) => ({
    ...task.toJSON(),
    project: task.projectId ? (projectMap.get(task.projectId.toString()) ?? null) : null,
  }));
}

function getUtcDayBounds(dayOffset = 0): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + dayOffset, 0, 0, 0, 0)
  );
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + dayOffset, 23, 59, 59, 999)
  );
  return { start, end };
}

async function assertProjectOwnership(userId: string, projectId: string): Promise<void> {
  const exists = await Project.exists({ _id: projectId, userId });
  if (!exists) {
    throw new AppError('Project not found', 404);
  }
}

export async function createTask(
  userId: string,
  input: CreateTaskInput
): Promise<TaskResponse> {
  if (input.projectId) {
    await assertProjectOwnership(userId, input.projectId);
  }

  const task = await Task.create({
    userId,
    projectId: input.projectId ?? undefined,
    title: input.title.trim(),
    dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
    dueTime: input.dueTime ? input.dueTime.trim() : undefined,
    priority: input.priority ?? 'medium',
  });

  const [enriched] = await attachProjects([task]);
  return enriched;
}

export async function listTasks(
  userId: string,
  filters: ListTasksFilter
): Promise<TaskResponse[]> {
  const queryFilter: Record<string, unknown> = {
    userId: new mongoose.Types.ObjectId(userId),
  };

  if (filters.projectId) {
    queryFilter.projectId = new mongoose.Types.ObjectId(filters.projectId);
  }
  if (filters.priority) {
    queryFilter.priority = filters.priority;
  }
  if (filters.isCompleted !== undefined) {
    queryFilter.isCompleted = filters.isCompleted;
  }
  if (filters.due === 'today') {
    const { start, end } = getUtcDayBounds(0);
    queryFilter.dueDate = { $gte: start, $lte: end };
  } else if (filters.due === 'tomorrow') {
    const { start, end } = getUtcDayBounds(1);
    queryFilter.dueDate = { $gte: start, $lte: end };
  } else if (filters.due === 'upcoming') {
    const { start } = getUtcDayBounds(0);
    queryFilter.dueDate = { $gte: start };
  }

  const sortOrder: Record<string, 1 | -1> =
    filters.isCompleted === true
      ? { completedAt: -1, updatedAt: -1 }
      : { isCompleted: 1, dueDate: 1, createdAt: -1 };

  const tasks = await Task.find(queryFilter).sort(sortOrder);

  if (filters.sort === 'priority') {
    tasks.sort((a, b) => {
      const rankDiff = PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
      if (rankDiff !== 0) return rankDiff;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }

  return attachProjects(tasks);
}

export async function getTaskById(
  userId: string,
  taskId: string
): Promise<TaskResponse> {
  const task = await Task.findOne({ _id: taskId, userId });
  if (!task) {
    throw new AppError('Task not found', 404);
  }
  const [enriched] = await attachProjects([task]);
  return enriched;
}

export async function updateTask(
  userId: string,
  taskId: string,
  input: UpdateTaskInput
): Promise<TaskResponse> {
  const task = await Task.findOne({ _id: taskId, userId });
  if (!task) {
    throw new AppError('Task not found', 404);
  }

  let hasChanges = false;

  if (input.title !== undefined) {
    task.title = input.title.trim();
    hasChanges = true;
  }

  if (input.projectId !== undefined) {
    if (input.projectId === null) {
      task.projectId = undefined;
    } else {
      await assertProjectOwnership(userId, input.projectId);
      task.projectId = new mongoose.Types.ObjectId(input.projectId);
    }
    hasChanges = true;
  }

  if (input.dueDate !== undefined) {
    task.dueDate = input.dueDate === null ? undefined : new Date(input.dueDate);
    hasChanges = true;
  }

  if (input.dueTime !== undefined) {
    task.dueTime = input.dueTime === null ? undefined : input.dueTime.trim();
    hasChanges = true;
  }

  if (input.priority !== undefined) {
    task.priority = input.priority;
    hasChanges = true;
  }

  if (input.isCompleted !== undefined) {
    task.isCompleted = input.isCompleted;
    task.completedAt = input.isCompleted ? new Date() : undefined;
    hasChanges = true;
  }

  if (!hasChanges) {
    throw new AppError('Provide at least one field to update', 400);
  }

  await task.save();
  const [enriched] = await attachProjects([task]);
  return enriched;
}

export async function toggleTaskCompletion(
  userId: string,
  taskId: string
): Promise<TaskResponse> {
  const task = await Task.findOne({ _id: taskId, userId });
  if (!task) {
    throw new AppError('Task not found', 404);
  }

  task.isCompleted = !task.isCompleted;
  task.completedAt = task.isCompleted ? new Date() : undefined;
  await task.save();

  const [enriched] = await attachProjects([task]);
  return enriched;
}

export async function deleteTask(userId: string, taskId: string): Promise<void> {
  const task = await Task.findOneAndDelete({ _id: taskId, userId });
  if (!task) {
    throw new AppError('Task not found', 404);
  }
}
