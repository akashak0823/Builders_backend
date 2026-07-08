"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../database");
const router = (0, express_1.Router)();
// GET dashboard stats
router.get('/stats', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // 1. Total Revenue (Sum of grandTotal of all invoices)
        const { data: invoices, error: revError } = yield database_1.supabase
            .from('billing_invoices')
            .select('grandTotal');
        if (revError)
            throw revError;
        const totalRevenue = invoices ? invoices.reduce((sum, inv) => sum + Number(inv.grandTotal), 0) : 0;
        // 2. Total Invoices Count
        const { count: totalInvoices, error: countInvError } = yield database_1.supabase
            .from('billing_invoices')
            .select('*', { count: 'exact', head: true });
        if (countInvError)
            throw countInvError;
        // 3. Total Products Count
        const { count: totalProducts, error: countProdError } = yield database_1.supabase
            .from('billing_products')
            .select('*', { count: 'exact', head: true });
        if (countProdError)
            throw countProdError;
        // 4. Recent Invoices (Limit 5)
        const { data: recentInvoices, error: recentError } = yield database_1.supabase
            .from('billing_invoices')
            .select('_id, invoiceNumber, customer, grandTotal, createdAt')
            .order('createdAt', { ascending: false })
            .limit(5);
        if (recentError)
            throw recentError;
        res.json({
            totalRevenue,
            totalInvoices: totalInvoices || 0,
            totalProducts: totalProducts || 0,
            recentInvoices: recentInvoices || []
        });
    }
    catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
}));
exports.default = router;
