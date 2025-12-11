import { Router } from 'express';
import { Invoice, Product } from '../database';
import puppeteer from 'puppeteer';

const router = Router();

// GET all invoices
router.get('/', async (req, res) => {
    try {
        const invoices = await Invoice.find().sort({ createdAt: -1 });
        res.json(invoices);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch invoices' });
    }
});

// POST create invoice
router.post('/', async (req, res) => {
    try {
        const { customer, items, date } = req.body;
        console.log('Received invoice request:', { customer, itemsCount: items?.length });

        if (!Array.isArray(items)) {
            return res.status(400).json({ error: 'Items must be an array' });
        }

        // Calculate totals
        let subtotal = 0;
        let totalGst = 0;

        const invoiceItemsData = [];
        for (const item of items) {
            console.log('Processing item:', item.productId);
            const product = await Product.findById(item.productId);
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

                await product.save();
                console.log('Product updated');
            } else {
                console.warn('Product not found for ID:', item.productId);
            }

            const base = item.quantity * item.unitPrice;
            const gst = base * (item.gstRate / 100);
            subtotal += base;
            totalGst += gst;
            invoiceItemsData.push({
                ...item,
                gstAmount: gst,
                totalAmount: base + gst,
            });
        }

        const grandTotal = subtotal + totalGst;
        const invoiceNumber = `INV-${Date.now()}`;

        const invoice = new Invoice({
            invoiceNumber,
            date: date || new Date(),
            customer,
            items: invoiceItemsData,
            subtotal,
            totalGst,
            grandTotal
        });

        await invoice.save();
        res.status(201).json(invoice);

    } catch (error) {
        console.error('Error in POST /invoices:', error);
        res.status(500).json({ error: 'Failed to create invoice' });
    }
});

// GET PDF
router.get('/:id/pdf', async (req, res) => {
    try {
        const { id } = req.params;
        const invoice = await Invoice.findById(id);

        if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

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
                <strong>${invoice.customer?.name || 'Customer'}</strong><br>
                ${invoice.customer?.address || ''}<br>
                GSTIN: ${invoice.customer?.gstNumber || 'N/A'}
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
                    ${invoice.items.map((item: any) => `
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

        const browser = await puppeteer.launch({ headless: "new" });
        const page = await browser.newPage();
        await page.setContent(htmlContent);
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
        await browser.close();

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Length': pdfBuffer.length,
            'Content-Disposition': `attachment; filename=invoice-${invoice.invoiceNumber}.pdf`
        });
        res.send(pdfBuffer);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to generate PDF' });
    }
});

export default router;
