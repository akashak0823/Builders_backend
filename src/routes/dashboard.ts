import { Router } from 'express';
import { Invoice, Product } from '../database';

const router = Router();

// GET dashboard stats
router.get('/stats', async (req, res) => {
    try {
        // 1. Total Revenue (Sum of grandTotal of all invoices)
        const revenueResult = await Invoice.aggregate([
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$grandTotal" }
                }
            }
        ]);
        const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

        // 2. Total Invoices Count
        const totalInvoices = await Invoice.countDocuments();

        // 3. Total Products Count
        const totalProducts = await Product.countDocuments();

        // 4. Recent Invoices (Limit 5)
        const recentInvoices = await Invoice.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('invoiceNumber customer grandTotal createdAt status'); // Select only needed fields

        res.json({
            totalRevenue,
            totalInvoices,
            totalProducts,
            recentInvoices
        });

    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
});

export default router;
