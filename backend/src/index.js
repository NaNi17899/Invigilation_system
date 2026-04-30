import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { connectDB } from './lib/db.js';
import authRoutes from './routes/auth.js';
import uploadRoutes from './routes/upload.js';
import scheduleRoutes from './routes/schedule.js';
import settingsRoutes from './routes/settings.js';
import facultyRoutes from './routes/faculty.js';
import { bootstrapAdmin } from './lib/bootstrap.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

// Ensure DB connection for serverless
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// Health
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', app: process.env.APP_NAME || 'Invigilator Allocation System' });
});

// Routes
app.use((req, res, next) => {
  if (req.url.startsWith('/api')) {
    req.url = req.url.replace('/api', '');
    if (req.url === '') req.url = '/';
  }
  next();
});

app.use('/auth', authRoutes);
app.use('/upload', uploadRoutes);
app.use('/schedule', scheduleRoutes);
app.use('/settings', settingsRoutes);
app.use('/faculty', facultyRoutes);

// Root
app.get('/', (_req, res) => {
  res.send('Invigilator Allocation System API');
});

// 404
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// Start
if (process.env.NODE_ENV !== 'production' || process.env.VERCEL) {
  // On Vercel or local, we might want to ensure DB is connected
  // However, Vercel handles serverless functions differently.
  // For standard Vercel deployment, we export the app.
}

// Export app for Vercel
export default app;

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  (async () => {
    try {
      await connectDB();
      await bootstrapAdmin();
      app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
    } catch (err) {
      console.error('Failed to start server:', err);
    }
  })();
}
