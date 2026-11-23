import mongoose from 'mongoose';
import { Task } from '../models/task.model.js';
import { User } from '../models/user.model.js';
import { AppError } from '../utils/AppError.js';

export interface DashboardMetrics {
  user: {
    name?: string;
    email: string;
    avatarUrl?: string;
  };
  today: {
    totalTasks: number;
    completedTasks: number;
    completionPercentage: number;
    completedTodayCount: number;
  };
  overall: {
    totalTasks: number;
    completedTasks: number;
    activeTasks: number;
    completionPercentage: number;
    highPriorityActive: number;
    overdueTasks: number;
  };
}

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

export async function getDashboardMetrics(userId: string): Promise<DashboardMetrics> {
  const user = await User.findOne({ _id: userId, deletedAt: null })
    .select('name email avatarUrl')
    .lean();

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const { start, end } = getUtcTodayBounds();
  const userObjectId = new mongoose.Types.ObjectId(userId);

  const [summary] = await Task.aggregate<{
    overallTotal: number;
    overallCompleted: number;
    todayTotal: number;
    todayCompleted: number;
    completedTodayCount: number;
    highPriorityActive: number;
    overdueTasks: number;
  }>([
    { $match: { userId: userObjectId } },
    {
      $group: {
        _id: null,
        overallTotal: { $sum: 1 },
        overallCompleted: {
          $sum: { $cond: [{ $eq: ['$isCompleted', true] }, 1, 0] },
        },
        todayTotal: {
          $sum: {
            $cond: [
              { $and: [{ $gte: ['$dueDate', start] }, { $lte: ['$dueDate', end] }] },
              1,
              0,
            ],
          },
        },
        todayCompleted: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$isCompleted', true] },
                  { $gte: ['$dueDate', start] },
                  { $lte: ['$dueDate', end] },
                ],
              },
              1,
              0,
            ],
          },
        },
        completedTodayCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$isCompleted', true] },
                  { $gte: ['$completedAt', start] },
                  { $lte: ['$completedAt', end] },
                ],
              },
              1,
              0,
            ],
          },
        },
        highPriorityActive: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$isCompleted', false] },
                  { $eq: ['$priority', 'high'] },
                ],
              },
              1,
              0,
            ],
          },
        },
        overdueTasks: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$isCompleted', false] },
                  { $ne: ['$dueDate', null] },
                  { $lt: ['$dueDate', start] },
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

  const overallTotal = summary?.overallTotal ?? 0;
  const overallCompleted = summary?.overallCompleted ?? 0;
  const todayTotal = summary?.todayTotal ?? 0;
  const todayCompleted = summary?.todayCompleted ?? 0;

  return {
    user: {
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
    },
    today: {
      totalTasks: todayTotal,
      completedTasks: todayCompleted,
      completionPercentage:
        todayTotal === 0 ? 0 : Math.round((todayCompleted / todayTotal) * 100),
      completedTodayCount: summary?.completedTodayCount ?? 0,
    },
    overall: {
      totalTasks: overallTotal,
      completedTasks: overallCompleted,
      activeTasks: overallTotal - overallCompleted,
      completionPercentage:
        overallTotal === 0 ? 0 : Math.round((overallCompleted / overallTotal) * 100),
      highPriorityActive: summary?.highPriorityActive ?? 0,
      overdueTasks: summary?.overdueTasks ?? 0,
    },
  };
}
