import fs from 'node:fs';
import path from 'node:path';
import swaggerJsdoc, { type Options } from 'swagger-jsdoc';
import { env } from './env.js';

const srcRoutesPattern = path.resolve(process.cwd(), 'src/routes/*.ts').replace(/\\/g, '/');
const distRoutesPattern = path.resolve(process.cwd(), 'dist/routes/*.js').replace(/\\/g, '/');
const apis = fs.existsSync(path.resolve(process.cwd(), 'src/routes'))
  ? [srcRoutesPattern]
  : [distRoutesPattern];

const options: Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Planora API',
      version: '1.0.0',
      description: 'Backend API documentation for Planora.',
    },
    tags: [
      { name: '1. Sign Up & Email Verification', description: 'Create account and verify email with 4-digit OTP' },
      { name: '2. Sign In & Session', description: 'Email/password, Google/Apple OAuth, refresh, and logout' },
      { name: '3. Password Reset', description: 'Forgot password, 4-digit reset code, and new password' },
      { name: '4. Projects', description: 'Create, list, update, and delete user projects' },
      { name: '5. Tasks', description: 'Create, list, update, complete, and delete tasks' },
      { name: '6. Profile', description: 'View and update profile details and avatar photo' },
      { name: '7. Dashboard', description: 'Dashboard greeting and task completion metrics' },
      { name: 'Health', description: 'Server and database status' },
    ],
    servers: [
      {
        url: '/',
        description: 'Current server',
      },
      {
        url: `http://localhost:${env.PORT}`,
        description: 'Local development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis,
};

export const swaggerSpec = swaggerJsdoc(options);
