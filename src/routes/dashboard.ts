import { Router } from 'express';
import { supabase } from '../database';

const router = Router();

// GET dashboard stats
router.get('/stats', async (req, res) => {
    try {
        // 1. Total Revenue (Sum of grandTotal of all invoices)
        const { data: invoices, error: revError } = await supabase
            .from('billing_invoices')
            .select('grandTotal');

        if (revError) throw revError;
        const totalRevenue = invoices ? invoices.reduce((sum, inv) => sum + Number(inv.grandTotal), 0) : 0;

        // 2. Total Invoices Count
        const { count: totalInvoices, error: countInvError } = await supabase
            .from('billing_invoices')
            .select('*', { count: 'exact', head: true });

        if (countInvError) throw countInvError;

        // 3. Total Products Count
        const { count: totalProducts, error: countProdError } = await supabase
            .from('billing_products')
            .select('*', { count: 'exact', head: true });

        if (countProdError) throw countProdError;

        // 4. Recent Invoices (Limit 5)
        const { data: recentInvoices, error: recentError } = await supabase
            .from('billing_invoices')
            .select('_id, invoiceNumber, customer, grandTotal, createdAt')
            .order('createdAt', { ascending: false })
            .limit(5);

        if (recentError) throw recentError;

        res.json({
            totalRevenue,
            totalInvoices: totalInvoices || 0,
            totalProducts: totalProducts || 0,
            recentInvoices: recentInvoices || []
        });

    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
});

export default router;
