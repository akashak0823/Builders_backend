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
exports.User = exports.Invoice = exports.Customer = exports.Product = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const connectDB = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const conn = yield mongoose_1.default.connect('mongodb+srv://Akash:Akash0515@database.otmxfxp.mongodb.net/Building_Bazaar?retryWrites=true&w=majority&appName=Database');
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    }
    catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
});
// Product Schema
const productSchema = new mongoose_1.default.Schema({
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
exports.Product = mongoose_1.default.model('Product', productSchema);
// Customer Schema
const customerSchema = new mongoose_1.default.Schema({
    name: { type: String, required: true },
    address: { type: String, required: true },
    gstNumber: { type: String },
}, { timestamps: true });
exports.Customer = mongoose_1.default.model('Customer', customerSchema);
// Invoice Schema
const invoiceItemSchema = new mongoose_1.default.Schema({
    productId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Product' }, // Optional ref if product deleted
    productName: { type: String, required: true }, // Snapshot of name
    hsnCode: { type: String },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    gstRate: { type: Number, required: true },
    gstAmount: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
});
const invoiceSchema = new mongoose_1.default.Schema({
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
exports.Invoice = mongoose_1.default.model('Invoice', invoiceSchema);
// User Schema
const userSchema = new mongoose_1.default.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'user'], default: 'user' },
}, { timestamps: true });
exports.User = mongoose_1.default.model('User', userSchema);
exports.default = connectDB;
