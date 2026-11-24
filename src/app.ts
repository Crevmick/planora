import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import { swaggerSpec } from './config/swagger.js';
import apiRoutes from './routes/index.js';
import { notFoundHandler, errorHandler } from './middlewares/error.middleware.js';

const app = express();

const allowedOrigins =
  env.CORS_ORIGIN.trim() === '*'
    ? true
    : env.CORS_ORIGIN.split(',')
        .map((o) => o.trim().replace(/\/+$/, ''))
        .filter(Boolean);

app.set('trust proxy', 1);
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

app.get('/', (_req: Request, res: Response) => {
  res.json({ message: 'Planora API is running' });
});

app.get('/api/docs.json', (_req: Request, res: Response) => {
  res.json(swaggerSpec);
});

app.use(
  '/api/docs',
  (_req: Request, res: Response, next: NextFunction) => {
    // Allow Swagger UI inline scripts/styles without disabling Helmet elsewhere.
    res.removeHeader('Content-Security-Policy');
    next();
  },
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    explorer: false,
    customSiteTitle: 'Planora API Docs',
    customCss: '.swagger-ui .models { display: none !important; }',
    swaggerOptions: {
      persistAuthorization: true,
      tryItOutEnabled: true,
      defaultModelsExpandDepth: -1,
    },
  })
);

app.use('/api', apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
