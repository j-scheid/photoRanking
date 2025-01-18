const express = require('express');
const multer = require('multer');
const { WebSocketServer } = require('ws');
const app = express();
const upload = multer({ dest: 'uploads/' });

let clients = [];
let images = [];
let currentImageIndex = 0;

app.use(express.static('public'));

const wss = new WebSocketServer({ port: 8080 });
wss.on('connection', (ws) => {
    const isAdmin = clients.length === 0; // First client is admin
    clients.push({ ws, isAdmin, hasRated: false });

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        if (data.type === 'rate') {
            handleRating(ws, data.rating);
        } else if (data.type === 'skip' && isAdmin) {
            skipImage();
        }
    });

    ws.send(JSON.stringify({ type: 'image', data: images[currentImageIndex] }));

    ws.on('close', () => {
        clients = clients.filter((client) => client.ws !== ws);
    });
});

app.post('/upload', upload.single('image'), (req, res) => {
    const newImage = { id: Date.now(), path: req.file.path, ratings: [] };
    images.push(newImage);
    res.sendStatus(200);
});

function handleRating(ws, rating) {
    const client = clients.find((client) => client.ws === ws);
    if (!client.hasRated) {
        images[currentImageIndex].ratings.push(rating);
        client.hasRated = true;

        const totalRatings = images[currentImageIndex].ratings.length;
        const avgRating = images[currentImageIndex].ratings.reduce((a, b) => a + b, 0) / totalRatings;

        broadcast({ type: 'update', data: { totalRatings } });

        if (totalRatings === clients.length) {
            if (avgRating > 4) {
                console.log('Featured Image:', images[currentImageIndex]);
            }
            currentImageIndex++;
            broadcast({ type: 'image', data: images[currentImageIndex] });
        }
    }
}

function skipImage() {
    currentImageIndex++;
    broadcast({ type: 'image', data: images[currentImageIndex] });
}

function broadcast(data) {
    clients.forEach((client) => client.ws.send(JSON.stringify(data)));
}

app.listen(3000, () => console.log('Server running on port 3000'));
