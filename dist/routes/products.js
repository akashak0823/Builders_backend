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
// GET all products
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { data: products, error } = yield database_1.supabase
            .from('billing_products')
            .select('*');
        if (error)
            throw error;
        res.json(products);
    }
    catch (error) {
        console.error('Fetch products error:', error);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
}));
// POST create product
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, productId, image, category, quantity, inStock, unit, basePrice, gstRate, hsnCode } = req.body;
        const { data: product, error } = yield database_1.supabase
            .from('billing_products')
            .insert({
            name,
            productId,
            image,
            category,
            quantity: quantity !== undefined ? Number(quantity) : 0,
            inStock: inStock !== undefined ? inStock : true,
            unit,
            basePrice: Number(basePrice),
            gstRate: Number(gstRate),
            hsnCode
        })
            .select()
            .single();
        if (error)
            throw error;
        res.status(201).json(product);
    }
    catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({ error: 'Failed to create product' });
    }
}));
// PUT update product
router.put('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name, productId, image, category, quantity, inStock, unit, basePrice, gstRate, hsnCode } = req.body;
        // Auto-update inStock based on quantity if not explicitly provided
        let stockStatus = inStock;
        if (quantity !== undefined) {
            stockStatus = Number(quantity) > 0;
        }
        const { data: product, error } = yield database_1.supabase
            .from('billing_products')
            .update({
            name,
            productId,
            image,
            category,
            quantity: quantity !== undefined ? Number(quantity) : undefined,
            inStock: stockStatus,
            unit,
            basePrice: basePrice !== undefined ? Number(basePrice) : undefined,
            gstRate: gstRate !== undefined ? Number(gstRate) : undefined,
            hsnCode,
            updatedAt: new Date()
        })
            .eq('_id', id)
            .select()
            .maybeSingle();
        if (error)
            throw error;
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json(product);
    }
    catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({ error: 'Failed to update product' });
    }
}));
// DELETE product
router.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { data: data, error } = yield database_1.supabase
            .from('billing_products')
            .delete()
            .eq('_id', id)
            .select();
        if (error)
            throw error;
        if (!data || data.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json({ message: 'Product deleted successfully' });
    }
    catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({ error: 'Failed to delete product' });
    }
}));
exports.default = router;
