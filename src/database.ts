import mongoose from 'mongoose';

const connectDB = async () => {
    try {
        const conn = await mongoose.connect('mongodb+srv://Akash:Akash0515@database.otmxfxp.mongodb.net/Building_Bazaar?retryWrites=true&w=majority&appName=Database');
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

// Product Schema
const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    productId: { type: String, required: true, unique: true },
    image: { type: String },
    category: { type: String, required: true },
    quantity: { type: Number, required: true, default: 0 },
    inStock: { type: Boolean, default: true },
    unit: { type: String, required: true },
    basePrice: { type: Number, required: true },
    gstRate: { type: Number, required: true },
    hsnCode: { type: String },
}, { timestamps: true });

export const Product = mongoose.model('Product', productSchema);

// Customer Schema
const customerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    address: { type: String, required: true },
    gstNumber: { type: String },
}, { timestamps: true });

export const Customer = mongoose.model('Customer', customerSchema);

// Invoice Schema
const invoiceItemSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }, // Optional ref if product deleted
    productName: { type: String, required: true }, // Snapshot of name
    hsnCode: { type: String },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    gstRate: { type: Number, required: true },
    gstAmount: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
});

const invoiceSchema = new mongoose.Schema({
    invoiceNumber: { type: String, required: true, unique: true },
    date: { type: Date, required: true },
    customer: {
        name: { type: String, required: true },
        address: { type: String, required: true },
        gstNumber: { type: String },
    },
    items: [invoiceItemSchema],
    subtotal: { type: Number, required: true },
    totalGst: { type: Number, required: true },
    grandTotal: { type: Number, required: true },
}, { timestamps: true });

export const Invoice = mongoose.model('Invoice', invoiceSchema);

// User Schema
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'user'], default: 'user' },
}, { timestamps: true });

export const User = mongoose.model('User', userSchema);

export default connectDB;
