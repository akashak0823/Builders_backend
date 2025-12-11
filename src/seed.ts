import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from './database';
import dotenv from 'dotenv';

dotenv.config();

const seedUser = async () => {
    try {
        await mongoose.connect('mongodb+srv://Akash:Akash0515@database.otmxfxp.mongodb.net/Building_Bazaar?retryWrites=true&w=majority&appName=Database');
        console.log('MongoDB Connected');

        // Check if admin exists
        const existingUser = await User.findOne({ email: 'admin@buildingbazaar.com' });
        if (existingUser) {
            console.log('Admin user already exists');
            process.exit(0);
        }

        // Create admin user
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin123', salt);

        const user = new User({
            name: 'Admin User',
            email: 'admin@buildingbazaar.com',
            password: hashedPassword,
            role: 'admin'
        });

        await user.save();
        console.log('Admin user created successfully');
        console.log('Email: admin@buildingbazaar.com');
        console.log('Password: admin123');

        process.exit(0);
    } catch (error) {
        console.error('Error seeding user:', error);
        process.exit(1);
    }
};

seedUser();
