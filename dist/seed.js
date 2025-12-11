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
const mongoose_1 = __importDefault(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_1 = require("./database");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const seedUser = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield mongoose_1.default.connect('mongodb+srv://Akash:Akash0515@database.otmxfxp.mongodb.net/Building_Bazaar?retryWrites=true&w=majority&appName=Database');
        console.log('MongoDB Connected');
        // Check if admin exists
        const existingUser = yield database_1.User.findOne({ email: 'admin@buildingbazaar.com' });
        if (existingUser) {
            console.log('Admin user already exists');
            process.exit(0);
        }
        // Create admin user
        const salt = yield bcryptjs_1.default.genSalt(10);
        const hashedPassword = yield bcryptjs_1.default.hash('admin123', salt);
        const user = new database_1.User({
            name: 'Admin User',
            email: 'admin@buildingbazaar.com',
            password: hashedPassword,
            role: 'admin'
        });
        yield user.save();
        console.log('Admin user created successfully');
        console.log('Email: admin@buildingbazaar.com');
        console.log('Password: admin123');
        process.exit(0);
    }
    catch (error) {
        console.error('Error seeding user:', error);
        process.exit(1);
    }
});
seedUser();
