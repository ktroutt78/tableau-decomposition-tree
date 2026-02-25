const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('.')); // Serve static files (index.html)

// API endpoint to process PDF
app.post('/api/process-pdf', async (req, res) => {
    try {
        const { apiKey, pdfBase64, prompt } = req.body;

        // Validate required fields
        if (!apiKey || !pdfBase64 || !prompt) {
            return res.status(400).json({
                error: 'Missing required fields: apiKey, pdfBase64, or prompt'
            });
        }

        // Validate API key format
        if (!apiKey.startsWith('sk-ant-')) {
            return res.status(400).json({
                error: 'Invalid API key format. Anthropic API keys should start with "sk-ant-"'
            });
        }

        // Validate PDF base64 data
        if (pdfBase64.length < 100) {
            return res.status(400).json({
                error: 'Invalid PDF data. The file appears to be too small or corrupted.'
            });
        }

        console.log('Processing PDF request...');
        const startTime = Date.now();

        const anthropic = new Anthropic({
            apiKey: apiKey,
        });

        const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 8192,
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'document',
                            source: {
                                type: 'base64',
                                media_type: 'application/pdf',
                                data: pdfBase64
                            }
                        },
                        {
                            type: 'text',
                            text: prompt
                        }
                    ]
                }
            ]
        });

        const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`PDF processed successfully in ${processingTime}s`);

        res.json({
            success: true,
            text: message.content[0].text,
            processingTime: processingTime
        });

    } catch (error) {
        console.error('Error processing PDF:', error);

        // Handle specific error types
        let errorMessage = 'Failed to process PDF';
        let statusCode = 500;

        if (error.status === 401) {
            errorMessage = 'Invalid API key. Please check your Anthropic API key.';
            statusCode = 401;
        } else if (error.status === 429) {
            errorMessage = 'Rate limit exceeded. Please try again in a few moments.';
            statusCode = 429;
        } else if (error.status === 400) {
            errorMessage = 'Invalid request. The PDF may be corrupted or in an unsupported format.';
            statusCode = 400;
        } else if (error.message) {
            errorMessage = error.message;
        }

        res.status(statusCode).json({
            error: errorMessage
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser to use the app`);
});
