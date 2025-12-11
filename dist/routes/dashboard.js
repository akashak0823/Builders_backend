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
        const revenueResult = yield database_1.Invoice.aggregate([
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$grandTotal" }
                }
            }
        ]);
        const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;
        // 2. Total Invoices Count
        const totalInvoices = yield database_1.Invoice.countDocuments();
        // 3. Total Products Count
        const totalProducts = yield database_1.Product.countDocuments();
        // 4. Recent Invoices (Limit 5)
        const recentInvoices = yield database_1.Invoice.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('invoiceNumber customer grandTotal createdAt status'); // Select only needed fields
        res.json({
            totalRevenue,
            totalInvoices,
            totalProducts,
            recentInvoices
        });
    }
    catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
}));
exports.default = router;
