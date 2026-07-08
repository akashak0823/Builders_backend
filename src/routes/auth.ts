import { Router } from 'express';
import { supabase } from '../database';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const router = Router();
const JWT_SECRET = 'your_jwt_secret_key'; // In production, use environment variable

// Register
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check if user exists
        const { data: existingUser, error: checkError } = await supabase
            .from('billing_users')
            .select('*')
            .eq('email', email)
            .maybeSingle();

        if (checkError) throw checkError;

        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const { data: user, error: insertError } = await supabase
            .from('billing_users')
            .insert({
                name,
                email,
                password: hashedPassword,
                role: 'user'
            })
            .select()
            .single();

        if (insertError) throw insertError;

        // Create token
        const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1d' });

        res.status(201).json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Failed to register user' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check user
        const { data: user, error: checkError } = await supabase
            .from('billing_users')
            .select('*')
            .eq('email', email)
            .maybeSingle();

        if (checkError) throw checkError;

        if (!user) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        // Create token
        const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1d' });

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Failed to login' });
    }
});

// Get User Profile (Protected)
router.get('/me', async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'No token, authorization denied' });
        }

        const decoded: any = jwt.verify(token, JWT_SECRET);

        const { data: user, error: findError } = await supabase
            .from('billing_users')
            .select('_id, name, email, role, createdAt, updatedAt')
            .eq('_id', decoded.id)
            .maybeSingle();

        if (findError) throw findError;

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error('Me error:', error);
        res.status(401).json({ error: 'Token is not valid' });
    }
});

export default router;
