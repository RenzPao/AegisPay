"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const config_1 = require("./config");
const claim_1 = require("./routes/claim");
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: config_1.config.ALLOWED_ORIGIN,
    methods: ['GET', 'POST', 'OPTIONS'],
}));
app.use(express_1.default.json());
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // limit each IP to 20 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/submit-claim', limiter);
app.use('/', claim_1.claimRouter);
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});
app.get('/status', (req, res) => {
    res.status(200).json({
        network: config_1.config.STELLAR_NETWORK,
        contract: config_1.config.CONTRACT_ID.slice(0, 6) + '...'
    });
});
const server = app.listen(config_1.config.PORT, () => {
    console.log(`Relayer server running on port ${config_1.config.PORT}`);
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
