const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const multer = require('multer');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const clients = {};
let clientIdCounter = 1;
let uploadedImages = [];
let ratings = {};

// Multer setup for file uploads
const upload = multer({ dest: 'uploads/' });

// Serve static files
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// WebSocket connection handling
wss.on('connection', (ws) => {
    const clientId = `Client-${clientIdCounter++}`;
    clients[clientId] = ws;

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        if (data.type === 'rateImage') {
            const { index, rating } = data;
            const imageUrl = uploadedImages[index];
            if (!ratings[imageUrl]) ratings[imageUrl] = [];
            ratings[imageUrl].push(Number(rating));

            const averageRating =
                ratings[imageUrl].reduce((a, b) => a + b, 0) / ratings[imageUrl].length;

            broadcast({
                type: 'updateRating',
                imageUrl,
                averageRating,
            });
        }
    });

    ws.send(JSON.stringify({ type: 'welcome', clientId }));
});

// Endpoint to handle file uploads
app.post('/upload', upload.single('image'), (req, res) => {
    const imageUrl = `/uploads/${req.file.filename}`;
    uploadedImages.push(imageUrl);
    ratings[imageUrl] = [];

    broadcast({
        type: 'newImage',
        clientId: req.body.clientId,
        imageUrl,
    });

    res.status(200).send('Image uploaded successfully');
});

function broadcast(data) {
    Object.values(clients).forEach((client) => {
        client.send(JSON.stringify(data));
    });
}

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
