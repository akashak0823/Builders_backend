import { Router } from 'express';
import { Product } from '../database';

const router = Router();

// GET all products
router.get('/', async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

// POST create product
router.post('/', async (req, res) => {
    try {
        const { name, productId, image, category, quantity, inStock, unit, basePrice, gstRate, hsnCode } = req.body;
        const product = new Product({ name, productId, image, category, quantity, inStock, unit, basePrice, gstRate, hsnCode });
        await product.save();
        res.status(201).json(product);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create product' });
    }
});

// PUT update product
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, productId, image, category, quantity, inStock, unit, basePrice, gstRate, hsnCode } = req.body;

        // Auto-update inStock based on quantity if not explicitly provided
        let stockStatus = inStock;
        if (quantity !== undefined) {
            stockStatus = quantity > 0;
        }

        const product = await Product.findByIdAndUpdate(
            id,
            { name, productId, image, category, quantity, inStock: stockStatus, unit, basePrice, gstRate, hsnCode },
            { new: true }
        );
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update product' });
    }
});

// DELETE product
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product.findByIdAndDelete(id);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete product' });
    }
});

export default router;
