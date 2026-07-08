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
exports.connectDB = exports.supabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const pg_1 = require("pg");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kndzwawhjlgxvjwfjymu.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuZHp3YXdoamxneHZqd2ZqeW11Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjY2MzA0MywiZXhwIjoyMDk4MjM5MDQzfQ.WaGXTLxjdSPSwOZ-Qha42FgX8aqscloIzReOox-twSY';
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:Akashdeveloper.0515@db.kndzwawhjlgxvjwfjymu.supabase.co:5432/postgres';
exports.supabase = (0, supabase_js_1.createClient)(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        persistSession: false,
        autoRefreshToken: false
    }
});
const connectDB = () => __awaiter(void 0, void 0, void 0, function* () {
    const client = new pg_1.Client({
        connectionString: DATABASE_URL,
    });
    try {
        yield client.connect();
        console.log('Connected to PostgreSQL via pg driver for migrations.');
        // 1. Enable extension
        yield client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
        // 2. Create separate tables with "billing_" prefix
        yield client.query(`
            CREATE TABLE IF NOT EXISTS billing_users (
                _id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'user',
                "createdAt" TIMESTAMPTZ DEFAULT NOW(),
                "updatedAt" TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        yield client.query(`
            CREATE TABLE IF NOT EXISTS billing_products (
                _id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name TEXT NOT NULL,
                "productId" TEXT UNIQUE NOT NULL,
                image TEXT,
                category TEXT NOT NULL,
                quantity INTEGER NOT NULL DEFAULT 0,
                "inStock" BOOLEAN DEFAULT TRUE,
                unit TEXT NOT NULL,
                "basePrice" NUMERIC NOT NULL,
                "gstRate" NUMERIC NOT NULL,
                "hsnCode" TEXT,
                "createdAt" TIMESTAMPTZ DEFAULT NOW(),
                "updatedAt" TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        yield client.query(`
            CREATE TABLE IF NOT EXISTS billing_customers (
                _id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name TEXT NOT NULL,
                address TEXT NOT NULL,
                "gstNumber" TEXT,
                "createdAt" TIMESTAMPTZ DEFAULT NOW(),
                "updatedAt" TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        yield client.query(`
            CREATE TABLE IF NOT EXISTS billing_invoices (
                _id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                "invoiceNumber" TEXT UNIQUE NOT NULL,
                date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                customer JSONB NOT NULL,
                items JSONB NOT NULL,
                subtotal NUMERIC NOT NULL,
                "totalGst" NUMERIC NOT NULL,
                "grandTotal" NUMERIC NOT NULL,
                "createdAt" TIMESTAMPTZ DEFAULT NOW(),
                "updatedAt" TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        console.log('PostgreSQL Billing Tables verified/created successfully.');
        // 3. Seed admin user in billing_users if not exists
        const res = yield client.query("SELECT * FROM billing_users WHERE email = 'admin@buildingbazaar.com'");
        if (res.rows.length === 0) {
            console.log('Seeding default admin user into billing_users...');
            const salt = yield bcryptjs_1.default.genSalt(10);
            const hashedPassword = yield bcryptjs_1.default.hash('admin123', salt);
            yield client.query(`INSERT INTO billing_users (name, email, password, role) VALUES ($1, $2, $3, $4)`, ['Admin User', 'admin@buildingbazaar.com', hashedPassword, 'admin']);
            console.log('Admin user seeded into billing_users.');
        }
        else {
            console.log('Admin user already exists in billing_users.');
        }
        // 4. Initialize Supabase storage bucket
        try {
            const { data: buckets, error: listError } = yield exports.supabase.storage.listBuckets();
            if (listError) {
                console.error('Error listing storage buckets:', listError.message);
            }
            else {
                const bucketExists = buckets && buckets.some(b => b.name === 'Products');
                if (!bucketExists) {
                    console.log("Bucket 'Products' does not exist. Creating...");
                    const { error: createError } = yield exports.supabase.storage.createBucket('Products', {
                        public: true,
                        allowedMimeTypes: ['image/*'],
                    });
                    if (createError) {
                        console.error('Failed to create bucket:', createError.message);
                    }
                    else {
                        console.log("Bucket 'Products' created and set to public.");
                    }
                }
                else {
                    console.log("Bucket 'Products' already exists.");
                }
            }
        }
        catch (storageErr) {
            console.error('Storage bucket initialization failed:', storageErr.message);
        }
    }
    catch (err) {
        console.error('Database migration/init failed:', err.message || err);
        console.log('NOTE: If you have already created the tables in the Supabase Dashboard SQL Editor, you can safely ignore this connection error! The application will function normally using the Supabase REST API.');
    }
    finally {
        yield client.end();
    }
});
exports.connectDB = connectDB;
exports.default = exports.connectDB;
