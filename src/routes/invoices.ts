import { Router } from 'express';
import { supabase } from '../database';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const router = Router();

// GET all invoices
router.get('/', async (req, res) => {
    try {
        const { data: invoices, error } = await supabase
            .from('billing_invoices')
            .select('*')
            .order('createdAt', { ascending: false });

        if (error) throw error;
        res.json(invoices);
    } catch (error) {
        console.error('Fetch invoices error:', error);
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
            
            // Find product by id (using UUID)
            const { data: product, error: productErr } = await supabase
                .from('billing_products')
                .select('*')
                .eq('_id', item.productId)
                .maybeSingle();

            if (productErr) throw productErr;

            if (product) {
                console.log('Found product:', product.name, 'Quantity:', product.quantity);
                const currentQty = product.quantity || 0;
                if (currentQty < item.quantity) {
                    console.error('Insufficient stock');
                    return res.status(400).json({ error: `Insufficient stock for ${product.name}` });
                }
                
                const updatedQty = currentQty - item.quantity;
                const inStock = updatedQty > 0;

                // Fix for legacy products missing productId
                let prodId = product.productId;
                if (!prodId) {
                    prodId = `PROD-${product._id.slice(-6).toUpperCase()}`;
                }

                // Update product in DB
                const { error: updateErr } = await supabase
                    .from('billing_products')
                    .update({
                        quantity: updatedQty,
                        inStock,
                        productId: prodId,
                        updatedAt: new Date()
                    })
                    .eq('_id', product._id);

                if (updateErr) throw updateErr;
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

        const { data: invoice, error: insertErr } = await supabase
            .from('billing_invoices')
            .insert({
                invoiceNumber,
                date: date || new Date(),
                customer, // JSONB
                items: invoiceItemsData, // JSONB
                subtotal,
                totalGst,
                grandTotal
            })
            .select()
            .single();

        if (insertErr) throw insertErr;
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
        
        const { data: invoice, error } = await supabase
            .from('billing_invoices')
            .select('*')
            .eq('_id', id)
            .maybeSingle();

        if (error) throw error;
        if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

        // Load logo as base64 Data URI
        let logoDataUri = '';
        try {
            const logoPath = path.join(process.cwd(), '..', 'client', 'public', 'logo.png');
            if (fs.existsSync(logoPath)) {
                const logoBuffer = fs.readFileSync(logoPath);
                logoDataUri = `data:image/png;base64,${logoBuffer.toString('base64')}`;
            } else {
                console.warn('Logo file not found at:', logoPath);
            }
        } catch (logoErr) {
            console.error('Failed to load logo for PDF:', logoErr);
        }

        // HTML Template for PDF with Branding
        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap');
                body { font-family: 'Montserrat', sans-serif; padding: 40px; color: #1E3353; }
                .header { display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 2px solid #F2C23E; padding-bottom: 20px; align-items: center; }
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
                <div style="display: flex; align-items: center; gap: 15px;">
                    ${logoDataUri ? `<img src="${logoDataUri}" style="height: 55px; width: auto;" />` : ''}
                    <div>
                        <div class="logo-text">BUILDERS <span class="logo-accent">BAZAAR</span></div>
                        <div class="company-details">
                            123 Construction Lane, Business City<br>
                            State, India - 560001<br>
                            GSTIN: 29ABCDE1234F1Z5
                        </div>
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
                        <td>${Number(item.unitPrice).toFixed(2)}</td>
                        <td>${(item.quantity * Number(item.unitPrice)).toFixed(2)}</td>
                        <td>${item.gstRate}%</td>
                        <td>${Number(item.gstAmount).toFixed(2)}</td>
                        <td>${Number(item.totalAmount).toFixed(2)}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>

            <div class="totals">
                <div class="total-row">
                    <span>Subtotal:</span>
                    <span>${Number(invoice.subtotal).toFixed(2)}</span>
                </div>
                <div class="total-row">
                    <span>Total GST:</span>
                    <span>${Number(invoice.totalGst).toFixed(2)}</span>
                </div>
                <div class="total-row grand-total">
                    <span>Grand Total:</span>
                    <span>₹${Number(invoice.grandTotal).toFixed(2)}</span>
                </div>
            </div>

            <div class="footer">
                <p>Thank you for your business!</p>
                <p>This is a computer-generated invoice and does not require a physical signature.</p>
            </div>
        </body>
        </html>
        `;

        // Search for system Chrome installation paths on Windows
        const chromePaths = [
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
            process.env.LOCALAPPDATA ? `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe` : null
        ].filter(Boolean) as string[];

        let executablePath: string | undefined;
        for (const p of chromePaths) {
            if (fs.existsSync(p)) {
                executablePath = p;
                console.log('Using system Chrome for PDF generation:', p);
                break;
            }
        }

        const browser = await puppeteer.launch({ 
            headless: "new",
            executablePath,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
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
