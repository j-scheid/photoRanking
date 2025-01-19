const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const isProduction = process.env.NODE_ENV === 'production'; // Check environment
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const clients = {};
let clientIdCounter = 1;
let photos = [];
let photoIdCounter = 1;

// Ensure the 'uploads' directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Multer setup for file uploads
const upload = multer({
    dest: uploadsDir,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Serve static files
app.use(express.static('public'));
app.use('/uploads', express.static(uploadsDir));

// WebSocket connection handling
wss.on('connection', (ws) => {
    const clientId = `Client-${clientIdCounter++}`;
    clients[clientId] = ws;

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        if (data.type === 'rateImage') {
            const { index, rating, clientId } = data;
            const photo = photos[index];
            if (!photo.ratings) photo.ratings = [];
            photo.ratings.push({ clientId, rating: Number(rating) });

            const averageRating =
                photo.ratings.reduce((a, b) => a + b.rating, 0) / photo.ratings.length;

            broadcast({
                type: 'updateRating',
                photo: { ...photo, averageRating },
            });
        }
    });

    ws.send(JSON.stringify({ type: 'welcome', clientId }));
});

// Endpoint to handle file uploads
app.post('/upload', upload.array('images'), (req, res) => {
    req.files.forEach((file) => {
        const imageUrl = `/uploads/${file.filename}`;
        const photo = { id: photoIdCounter++, url: imageUrl, clientId: req.body.clientId, ratings: [] };
        photos.push(photo);

        broadcast({
            type: 'newImage',
            photo,
        });
    });

    res.status(200).send('Images uploaded successfully');
});

function broadcast(data) {
    Object.values(clients).forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on ${isProduction ? 'Render' : 'localhost'} at port ${PORT}`);
});

app.get('/photos', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'photos.html'));
});
