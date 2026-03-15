// server.js
import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import multer from 'multer';
import { GoogleGenerativeAI } from '@google/generative-ai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
});

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Instantiate the model
const generativeModel = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('.'));

// Rate limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes'
});

// Routes
app.get('/', (req, res) => {
    res.sendFile('index.html', { root: __dirname });
});

// Handle file uploads
app.post('/api/upload', upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        res.json({
            filename: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Error processing file upload' });
    }
});

// Gemini API endpoint
app.post('/api/gemini', apiLimiter, upload.single('image'), async (req, res) => {
    try {
        const { prompt } = req.body;
        
        // Handle file upload if present
        let parts = [{ text: prompt }];
        if (req.file) {
            parts.push({
                inlineData: {
                    data: req.file.buffer.toString('base64'),
                    mimeType: req.file.mimetype
                }
            });
        }

        const result = await generativeModel.generateContent({
            contents: [{ role: 'user', parts }],
        });
        const response = await result.response;
        const generatedText = response.text();

        res.json({ content: generatedText });

    } catch (error) {
        console.error('Gemini AI Error:', error);
        res.status(500).json({ 
            error: 'Failed to process request via Gemini AI',
            details: error.message 
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ 
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`\n😎 AI Proxy Server listening on http://localhost:${PORT}`);
    console.log(`Target Model: gemini-2.0-flash`);
});
