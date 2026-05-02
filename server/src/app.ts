import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { ensureProblemSchema, ensureUserSchema, ensureTestCasesSchema, ensureContestSchema, ensureCategoryTagSchema, ensureIndexes, testConnection } from './config/database';
import { config, validateConfig } from './config';
import { errorHandler } from './middlewares/errorHandler';
import { rateLimiter } from './middlewares/rateLimiter';
import authRoutes from './routes/auth';
import problemRoutes from './routes/problems';
import submissionRoutes from './routes/submissions';
import contestRoutes from './routes/contests';
import discussionRoutes from './routes/discussions';
import statsRoutes from './routes/stats';
import uploadRoutes from './routes/upload';
import categoryRoutes from './routes/categories';

dotenv.config();

const app: express.Express = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false,
}));

app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(rateLimiter);

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads'), {
  setHeaders: (res) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
  },
}));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/contests', contestRoutes);
app.use('/api/discussions', discussionRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api', categoryRoutes);

app.use(errorHandler);

async function bootstrap() {
  validateConfig();
  await testConnection();
  await ensureProblemSchema();
  await ensureUserSchema();
  await ensureTestCasesSchema();
  await ensureContestSchema();
  await ensureCategoryTagSchema();
  await ensureIndexes();

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
  });
}

void bootstrap().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

export default app;
