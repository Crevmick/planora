import { Router } from 'express';
import * as taskController from '../controllers/task.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createTaskValidator,
  listTasksValidator,
  taskIdValidator,
  updateTaskValidator,
} from '../validators/task.validator.js';

const router = Router();

router.use(requireAuth);

/**
 * @openapi
 * /api/tasks:
 *   post:
 *     tags:
 *       - 5. Tasks
 *     summary: Create a new task
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title:
 *                 type: string
 *                 example: Finalize Sprint Roadmap
 *               projectId:
 *                 type: string
 *                 nullable: true
 *                 description: ID of the project (e.g. Work, Personal, Freelance)
 *                 example: 665f1b2c3d4e5f6789012345
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *                 example: "2026-05-10T00:00:00.000Z"
 *               dueTime:
 *                 type: string
 *                 nullable: true
 *                 example: "11:30 AM"
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high]
 *                 default: medium
 *                 example: high
 *     responses:
 *       201:
 *         description: Task created successfully
 *       400:
 *         description: Validation failed
 *       404:
 *         description: Project not found
 */
router.post('/', validate(createTaskValidator), taskController.createTask);

/**
 * @openapi
 * /api/tasks:
 *   get:
 *     tags:
 *       - 5. Tasks
 *     summary: List tasks for the current user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high]
 *       - in: query
 *         name: isCompleted
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: due
 *         schema:
 *           type: string
 *           enum: [today, tomorrow, upcoming]
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [default, priority]
 *         description: Use `priority` for the Inbox Priority tab (sorts High -> Medium -> Low)
 *     responses:
 *       200:
 *         description: List of tasks
 *       401:
 *         description: Unauthorized
 */
router.get('/', validate(listTasksValidator), taskController.listTasks);

/**
 * @openapi
 * /api/tasks/{id}:
 *   get:
 *     tags:
 *       - 5. Tasks
 *     summary: Get a task by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task details
 *       404:
 *         description: Task not found
 */
router.get('/:id', validate(taskIdValidator), taskController.getTaskById);

/**
 * @openapi
 * /api/tasks/{id}:
 *   patch:
 *     tags:
 *       - 5. Tasks
 *     summary: Update a task
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               projectId:
 *                 type: string
 *                 nullable: true
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *               dueTime:
 *                 type: string
 *                 nullable: true
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high]
 *               isCompleted:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Task updated successfully
 *       404:
 *         description: Task or project not found
 */
router.patch('/:id', validate(updateTaskValidator), taskController.updateTask);

/**
 * @openapi
 * /api/tasks/{id}/toggle:
 *   patch:
 *     tags:
 *       - 5. Tasks
 *     summary: Toggle task completion (move to Done or back to active)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task completion toggled
 *       404:
 *         description: Task not found
 */
router.patch('/:id/toggle', validate(taskIdValidator), taskController.toggleTaskCompletion);

/**
 * @openapi
 * /api/tasks/{id}:
 *   delete:
 *     tags:
 *       - 5. Tasks
 *     summary: Delete a task
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task deleted successfully
 *       404:
 *         description: Task not found
 */
router.delete('/:id', validate(taskIdValidator), taskController.deleteTask);

export default router;
