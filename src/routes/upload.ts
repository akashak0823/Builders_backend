import { Router } from 'express';
import multer from 'multer';
import { supabase } from '../database';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        // Generate unique filename
        const ext = req.file.originalname.split('.').pop() || 'jpg';
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;

        // Upload to Supabase Storage Bucket 'Products'
        const { data, error } = await supabase.storage
            .from('Products')
            .upload(fileName, req.file.buffer, {
                contentType: req.file.mimetype,
                upsert: true
            });

        if (error) {
            throw error;
        }

        // Get public URL
        const { data: publicUrlData } = supabase.storage
            .from('Products')
            .getPublicUrl(fileName);

        if (!publicUrlData || !publicUrlData.publicUrl) {
            throw new Error('Failed to get public URL');
        }

        res.json({ url: publicUrlData.publicUrl });
    } catch (error: any) {
        console.error('Upload Error:', error);
        res.status(500).json({ error: 'Image upload failed: ' + (error.message || error) });
    }
});

export default router;
