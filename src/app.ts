import express from 'express';
import cors from 'cors';
import connectDB from './database';
import productRoutes from './routes/products';
import invoiceRoutes from './routes/invoices';
import uploadRoutes from './routes/upload';

import dashboardRoutes from './routes/dashboard';
import authRoutes from './routes/auth';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Connect to MongoDB
connectDB();

// Routes
app.use('/auth', authRoutes);
app.use('/products', productRoutes);
app.use('/invoices', invoiceRoutes);
app.use('/upload', uploadRoutes);
app.use('/dashboard', dashboardRoutes);

app.get('/', (req, res) => {
    res.send('builders bazaar Billing API is running (MongoDB).');
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    // Server started
});
