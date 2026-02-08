// server.js
import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import multer from 'multer';

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
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent';

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
        const { prompt, html, isRefinement, selectedElementHtml, selectedElementXPath, isTargetedRefinement } = req.body;
        
        if (!GEMINI_API_KEY) {
            return res.status(500).json({ error: 'API key not configured' });
        }

        // Handle file upload if present
        let imageData = null;
        if (req.file) {
            imageData = {
                buffer: req.file.buffer,
                mimetype: req.file.mimetype
            };
        }

        // Construct the request to Gemini API
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        role: "user",
                        parts: [
                            { text: prompt },
                            ...(imageData ? [{
                                inlineData: {
                                    data: imageData.buffer.toString('base64'),
                                    mimeType: imageData.mimetype
                                }
                            }] : [])
                        ]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 2048,
                    }
                })
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error:', errorText);
            return res.status(response.status).json({ 
                error: 'API request failed',
                details: errorText 
            });
        }

        const responseData = await response.json();

        // Extract the text from the response
        let generatedText = '';
        try {
            generatedText = responseData.candidates?.[0]?.content?.parts?.[0]?.text || '';
        } catch (e) {
            console.error('Error parsing response:', e);
            return res.status(500).json({ 
                error: 'Error processing API response',
                details: e.message 
            });
        }

        res.json({ content: generatedText });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ 
            error: 'Failed to process request',
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
    console.log(`Target Model: gemini-2.5-pro`);
});
