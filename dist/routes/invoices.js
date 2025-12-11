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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../database");
const puppeteer_1 = __importDefault(require("puppeteer"));
const router = (0, express_1.Router)();
// GET all invoices
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const invoices = yield database_1.Invoice.find().sort({ createdAt: -1 });
        res.json(invoices);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch invoices' });
    }
}));
// POST create invoice
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { customer, items, date } = req.body;
        console.log('Received invoice request:', { customer, itemsCount: items === null || items === void 0 ? void 0 : items.length });
        if (!Array.isArray(items)) {
            return res.status(400).json({ error: 'Items must be an array' });
        }
        // Calculate totals
        let subtotal = 0;
        let totalGst = 0;
        const invoiceItemsData = [];
        for (const item of items) {
            console.log('Processing item:', item.productId);
            const product = yield database_1.Product.findById(item.productId);
            if (product) {
                console.log('Found product:', product.name, 'Quantity:', product.quantity);
                const currentQty = product.quantity || 0;
                if (currentQty < item.quantity) {
                    console.error('Insufficient stock');
                    return res.status(400).json({ error: `Insufficient stock for ${product.name}` });
                }
                product.quantity = currentQty - item.quantity;
                if (product.quantity === 0) {
                    product.inStock = false;
                }
                // Fix for legacy products missing productId
                if (!product.productId) {
                    product.productId = `PROD-${product._id.toString().slice(-6).toUpperCase()}`;
                }
                yield product.save();
                console.log('Product updated');
            }
            else {
                console.warn('Product not found for ID:', item.productId);
            }
            const base = item.quantity * item.unitPrice;
            const gst = base * (item.gstRate / 100);
            subtotal += base;
            totalGst += gst;
            invoiceItemsData.push(Object.assign(Object.assign({}, item), { gstAmount: gst, totalAmount: base + gst }));
        }
        const grandTotal = subtotal + totalGst;
        const invoiceNumber = `INV-${Date.now()}`;
        const invoice = new database_1.Invoice({
            invoiceNumber,
            date: date || new Date(),
            customer,
            items: invoiceItemsData,
            subtotal,
            totalGst,
            grandTotal
        });
        yield invoice.save();
        res.status(201).json(invoice);
    }
    catch (error) {
        console.error('Error in POST /invoices:', error);
        res.status(500).json({ error: 'Failed to create invoice' });
    }
}));
// GET PDF
router.get('/:id/pdf', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const { id } = req.params;
        const invoice = yield database_1.Invoice.findById(id);
        if (!invoice)
            return res.status(404).json({ error: 'Invoice not found' });
        // HTML Template for PDF with Branding
        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap');
                body { font-family: 'Montserrat', sans-serif; padding: 40px; color: #1E3353; }
                .header { display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 2px solid #F2C23E; padding-bottom: 20px; }
                .logo-text { font-size: 28px; font-weight: 800; color: #1E3353; }
                .logo-accent { color: #F2C23E; }
                .company-details { font-size: 12px; color: #3F4A5A; margin-top: 5px; }
                
                .invoice-title { font-size: 40px; font-weight: 800; color: #F2C23E; text-align: right; }
                .invoice-meta { text-align: right; margin-top: 10px; font-size: 14px; }
                
                .bill-to { margin-top: 30px; background: #E6EAEE; padding: 20px; border-radius: 10px; }
                .bill-to h3 { margin: 0 0 10px 0; font-size: 14px; color: #3F4A5A; text-transform: uppercase; }
                
                table { width: 100%; border-collapse: collapse; margin-top: 40px; }
                th { background-color: #1E3353; color: white; padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; }
                td { padding: 12px; border-bottom: 1px solid #E6EAEE; font-size: 13px; color: #3F4A5A; }
                tr:nth-child(even) { background-color: #FAFAFA; }
                
                .totals { margin-top: 30px; margin-left: auto; width: 300px; }
                .total-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
                .grand-total { border-top: 2px solid #F2C23E; padding-top: 10px; font-weight: 800; font-size: 18px; color: #1E3353; }
                
                .footer { margin-top: 60px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
            </style>
        </head>
        <body>
            <div class="header">
                <div>
                    <div class="logo-text">BUILDERS <span class="logo-accent">BAZAAR</span></div>
                    <div class="company-details">
                        123 Construction Lane, Business City<br>
                        State, India - 560001<br>
                        GSTIN: 29ABCDE1234F1Z5
                    </div>
                </div>
                <div>
                    <div class="invoice-title">INVOICE</div>
                    <div class="invoice-meta">
                        <strong>#${invoice.invoiceNumber}</strong><br>
                        Date: ${new Date(invoice.date).toLocaleDateString()}
                    </div>
                </div>
            </div>

            <div class="bill-to">
                <h3>Bill To</h3>
                <strong>${((_a = invoice.customer) === null || _a === void 0 ? void 0 : _a.name) || 'Customer'}</strong><br>
                ${((_b = invoice.customer) === null || _b === void 0 ? void 0 : _b.address) || ''}<br>
                GSTIN: ${((_c = invoice.customer) === null || _c === void 0 ? void 0 : _c.gstNumber) || 'N/A'}
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Product</th>
                        <th>HSN</th>
                        <th>Qty</th>
                        <th>Rate</th>
                        <th>Taxable</th>
                        <th>GST %</th>
                        <th>GST Amt</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${invoice.items.map((item) => `
                    <tr>
                        <td>${item.productName}</td>
                        <td>${item.hsnCode || '-'}</td>
                        <td>${item.quantity}</td>
                        <td>${item.unitPrice.toFixed(2)}</td>
                        <td>${(item.quantity * item.unitPrice).toFixed(2)}</td>
                        <td>${item.gstRate}%</td>
                        <td>${item.gstAmount.toFixed(2)}</td>
                        <td>${item.totalAmount.toFixed(2)}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>

            <div class="totals">
                <div class="total-row">
                    <span>Subtotal:</span>
                    <span>${invoice.subtotal.toFixed(2)}</span>
                </div>
                <div class="total-row">
                    <span>Total GST:</span>
                    <span>${invoice.totalGst.toFixed(2)}</span>
                </div>
                <div class="total-row grand-total">
                    <span>Grand Total:</span>
                    <span>₹${invoice.grandTotal.toFixed(2)}</span>
                </div>
            </div>

            <div class="footer">
                <p>Thank you for your business!</p>
                <p>This is a computer-generated invoice and does not require a physical signature.</p>
            </div>
        </body>
        </html>
        `;
        const browser = yield puppeteer_1.default.launch({ headless: "new" });
        const page = yield browser.newPage();
        yield page.setContent(htmlContent);
        const pdfBuffer = yield page.pdf({ format: 'A4', printBackground: true });
        yield browser.close();
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Length': pdfBuffer.length,
            'Content-Disposition': `attachment; filename=invoice-${invoice.invoiceNumber}.pdf`
        });
        res.send(pdfBuffer);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to generate PDF' });
    }
}));
exports.default = router;
