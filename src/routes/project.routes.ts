import { Router } from 'express';
import * as projectController from '../controllers/project.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createProjectValidator,
  projectIdValidator,
  updateProjectValidator,
} from '../validators/project.validator.js';

const router = Router();

router.use(requireAuth);

/**
 * @openapi
 * /api/projects:
 *   post:
 *     tags:
 *       - 4. Projects
 *     summary: Create a new project
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, color]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Marketing
 *               color:
 *                 type: string
 *                 description: Hex color code (preset UI colors - #156E30, #0088FF, #C64B00, #161E2E, #E84142)
 *                 example: "#156E30"
 *     responses:
 *       201:
 *         description: Project created successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 */
router.post('/', validate(createProjectValidator), projectController.createProject);

/**
 * @openapi
 * /api/projects:
 *   get:
 *     tags:
 *       - 4. Projects
 *     summary: List all projects for the current user
 *     description: Returns all projects owned by the authenticated user along with task summary stats (`totalTasks`, `completedTasks`, `dueTodayTasks`, `completionPercentage`).
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user projects with task stats
 *       401:
 *         description: Unauthorized
 */
router.get('/', projectController.listProjects);

/**
 * @openapi
 * /api/projects/{id}:
 *   get:
 *     tags:
 *       - 4. Projects
 *     summary: Get a project by ID
 *     description: Returns a single project owned by the authenticated user along with its task summary stats and `tasks` array.
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
 *         description: Project details with task stats
 *       404:
 *         description: Project not found
 */
router.get('/:id', validate(projectIdValidator), projectController.getProjectById);

/**
 * @openapi
 * /api/projects/{id}:
 *   patch:
 *     tags:
 *       - 4. Projects
 *     summary: Update a project
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
 *               name:
 *                 type: string
 *                 example: Product Launch
 *               color:
 *                 type: string
 *                 example: "#0088FF"
 *     responses:
 *       200:
 *         description: Project updated successfully
 *       404:
 *         description: Project not found
 */
router.patch('/:id', validate(updateProjectValidator), projectController.updateProject);

/**
 * @openapi
 * /api/projects/{id}:
 *   delete:
 *     tags:
 *       - 4. Projects
 *     summary: Delete a project
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
 *         description: Project deleted successfully
 *       404:
 *         description: Project not found
 */
router.delete('/:id', validate(projectIdValidator), projectController.deleteProject);

export default router;
