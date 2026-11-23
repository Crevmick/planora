import mongoose from 'mongoose';
import { Project, type IProject } from '../models/project.model.js';
import { Task, type ITask } from '../models/task.model.js';
import { AppError } from '../utils/AppError.js';

export interface ProjectStats {
  totalTasks: number;
  completedTasks: number;
  dueTodayTasks: number;
  completionPercentage: number;
}

export type ProjectWithStats = ReturnType<IProject['toJSON']> & {
  stats: ProjectStats;
};

export type ProjectWithTasks = ProjectWithStats & {
  tasks: Array<ReturnType<ITask['toJSON']>>;
};

const EMPTY_STATS: ProjectStats = {
  totalTasks: 0,
  completedTasks: 0,
  dueTodayTasks: 0,
  completionPercentage: 0,
};

function getUtcTodayBounds(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0)
  );
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999)
  );
  return { start, end };
}

async function getStatsByProjectIds(
  userId: string,
  projectIds: mongoose.Types.ObjectId[]
): Promise<Map<string, ProjectStats>> {
  const statsMap = new Map<string, ProjectStats>();
  if (projectIds.length === 0) {
    return statsMap;
  }

  const { start, end } = getUtcTodayBounds();

  const rows = await Task.aggregate<{
    _id: mongoose.Types.ObjectId;
    totalTasks: number;
    completedTasks: number;
    dueTodayTasks: number;
  }>([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        projectId: { $in: projectIds },
      },
    },
    {
      $group: {
        _id: '$projectId',
        totalTasks: { $sum: 1 },
        completedTasks: {
          $sum: { $cond: [{ $eq: ['$isCompleted', true] }, 1, 0] },
        },
        dueTodayTasks: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $gte: ['$dueDate', start] },
                  { $lte: ['$dueDate', end] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  for (const row of rows) {
    const completionPercentage =
      row.totalTasks === 0 ? 0 : Math.round((row.completedTasks / row.totalTasks) * 100);
    statsMap.set(row._id.toString(), {
      totalTasks: row.totalTasks,
      completedTasks: row.completedTasks,
      dueTodayTasks: row.dueTodayTasks,
      completionPercentage,
    });
  }

  return statsMap;
}

function attachStats(project: IProject, stats?: ProjectStats): ProjectWithStats {
  return {
    ...project.toJSON(),
    stats: stats ?? { ...EMPTY_STATS },
  };
}

export async function createProject(
  userId: string,
  input: { name: string; color: string }
): Promise<ProjectWithStats> {
  const project = await Project.create({
    userId,
    name: input.name.trim(),
    color: input.color.trim().toUpperCase(),
  });

  return attachStats(project);
}

export async function listProjects(userId: string): Promise<ProjectWithStats[]> {
  const projects = await Project.find({ userId }).sort({ createdAt: -1 });
  const statsMap = await getStatsByProjectIds(
    userId,
    projects.map((p) => p._id as mongoose.Types.ObjectId)
  );

  return projects.map((project) => attachStats(project, statsMap.get(project._id.toString())));
}

export async function getProjectById(
  userId: string,
  projectId: string
): Promise<ProjectWithTasks> {
  const project = await Project.findOne({ _id: projectId, userId });
  if (!project) {
    throw new AppError('Project not found', 404);
  }

  const tasks = await Task.find({
    userId: new mongoose.Types.ObjectId(userId),
    projectId: project._id,
  }).sort({ isCompleted: 1, dueDate: 1, createdAt: -1 });

  const { start, end } = getUtcTodayBounds();
  const totalTasks = tasks.length;
  let completedTasks = 0;
  let dueTodayTasks = 0;

  for (const task of tasks) {
    if (task.isCompleted) completedTasks += 1;
    if (task.dueDate && task.dueDate >= start && task.dueDate <= end) {
      dueTodayTasks += 1;
    }
  }

  const stats: ProjectStats = {
    totalTasks,
    completedTasks,
    dueTodayTasks,
    completionPercentage:
      totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100),
  };

  return {
    ...attachStats(project, stats),
    tasks: tasks.map((task) => task.toJSON()),
  };
}

export async function updateProject(
  userId: string,
  projectId: string,
  input: { name?: string; color?: string }
): Promise<ProjectWithStats> {
  const updates: { name?: string; color?: string } = {};

  if (input.name !== undefined) {
    updates.name = input.name.trim();
  }
  if (input.color !== undefined) {
    updates.color = input.color.trim().toUpperCase();
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError('Provide at least one field to update', 400);
  }

  const project = await Project.findOneAndUpdate(
    { _id: projectId, userId },
    { $set: updates },
    { new: true, runValidators: true }
  );

  if (!project) {
    throw new AppError('Project not found', 404);
  }

  const statsMap = await getStatsByProjectIds(userId, [
    project._id as mongoose.Types.ObjectId,
  ]);
  return attachStats(project, statsMap.get(project._id.toString()));
}

export async function deleteProject(userId: string, projectId: string): Promise<void> {
  const project = await Project.findOneAndDelete({ _id: projectId, userId });
  if (!project) {
    throw new AppError('Project not found', 404);
  }

  await Task.deleteMany({ projectId: project._id, userId });
}
