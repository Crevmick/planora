import 'dotenv/config';
import { env } from './config/env.js';
import app from './app.js';
import { connectDB } from './config/db.js';

async function startServer(): Promise<void> {
  try {
    await connectDB();
    app.listen(env.PORT, () => {
      console.log(`Server listening on http://localhost:${env.PORT}`);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to start server:', message);
    process.exit(1);
  }
}

startServer();
