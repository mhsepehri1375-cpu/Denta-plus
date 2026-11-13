import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createSeedClinicState } from './src/data/seedData';
import type { ClinicState } from './src/types/clinic';

const PORT = 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'clinic-db.json');

function ensureDbFile(): ClinicState {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const seed = createSeedClinicState();
    fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2), 'utf-8');
    return seed;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw) as ClinicState;
  } catch {
    const seed = createSeedClinicState();
    fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2), 'utf-8');
    return seed;
  }
}

function saveDbState(state: ClinicState): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  let clinicState: ClinicState = ensureDbFile();

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/clinic', (_req, res) => {
    res.json(clinicState);
  });

  app.put('/api/clinic', (req, res) => {
    const incoming = req.body as ClinicState;
    if (!incoming || !Array.isArray(incoming.patients) || !Array.isArray(incoming.appointments)) {
      res.status(400).json({ error: 'ساختار داده‌های ارسالی معتبر نیست.' });
      return;
    }
    clinicState = incoming;
    saveDbState(clinicState);
    res.json(clinicState);
  });

  app.post('/api/clinic/reset', (_req, res) => {
    clinicState = createSeedClinicState();
    saveDbState(clinicState);
    res.json(clinicState);
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Dentaplus server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
