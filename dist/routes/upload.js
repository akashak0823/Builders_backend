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
const multer_1 = __importDefault(require("multer"));
const database_1 = require("../database");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
router.post('/', upload.single('image'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }
        // Generate unique filename
        const ext = req.file.originalname.split('.').pop() || 'jpg';
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
        // Upload to Supabase Storage Bucket 'Products'
        const { data, error } = yield database_1.supabase.storage
            .from('Products')
            .upload(fileName, req.file.buffer, {
            contentType: req.file.mimetype,
            upsert: true
        });
        if (error) {
            throw error;
        }
        // Get public URL
        const { data: publicUrlData } = database_1.supabase.storage
            .from('Products')
            .getPublicUrl(fileName);
        if (!publicUrlData || !publicUrlData.publicUrl) {
            throw new Error('Failed to get public URL');
        }
        res.json({ url: publicUrlData.publicUrl });
    }
    catch (error) {
        console.error('Upload Error:', error);
        res.status(500).json({ error: 'Image upload failed: ' + (error.message || error) });
    }
}));
exports.default = router;
