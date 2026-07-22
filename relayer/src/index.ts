import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { claimRouter } from './routes/claim';

const app = express();

app.use(helmet());
app.use(cors({
  origin: config.ALLOWED_ORIGIN,
  methods: ['GET', 'POST', 'OPTIONS'],
}));
app.use(express.json());

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // limit each IP to 20 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/submit-claim', limiter);
app.use('/', claimRouter);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/status', (req, res) => {
  res.status(200).json({ 
    network: config.STELLAR_NETWORK,
    contract: config.CONTRACT_ID.slice(0, 6) + '...'
  });
});

const server = app.listen(config.PORT, () => {
  console.log(`Relayer server running on port ${config.PORT}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});
