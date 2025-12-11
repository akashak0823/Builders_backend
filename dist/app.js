"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const database_1 = __importDefault(require("./database"));
const products_1 = __importDefault(require("./routes/products"));
const invoices_1 = __importDefault(require("./routes/invoices"));
const upload_1 = __importDefault(require("./routes/upload"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const auth_1 = __importDefault(require("./routes/auth"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Connect to MongoDB
(0, database_1.default)();
// Routes
app.use('/auth', auth_1.default);
app.use('/products', products_1.default);
app.use('/invoices', invoices_1.default);
app.use('/upload', upload_1.default);
app.use('/dashboard', dashboard_1.default);
app.get('/', (req, res) => {
    res.send('builders bazaar Billing API is running (MongoDB).');
});
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
