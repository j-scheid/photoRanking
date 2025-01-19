// Dynamically determine WebSocket URL based on environment
const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
const ws = new WebSocket(`${protocol}://${location.host}`);

let clientId = null;
let currentPhotoIndex = 0;
let photos = [];
let ratedImages = new Set();

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === 'welcome') {
        clientId = data.clientId;
        console.log(`Assigned Client ID: ${clientId}`);
        document.getElementById('uploadModal').style.display = 'block';
    }

    if (data.type === 'newImage') {
        photos.push(data.photo);
        console.log('Photos array updated:', photos);
        if (photos.length === 1) {
            displayImageForRating();
        }
        updateGallery();
    }

    if (data.type === 'updateRating') {
        const photoIndex = photos.findIndex(photo => photo.id === data.photo.id);
        if (photoIndex !== -1) {
            photos[photoIndex] = data.photo;
            console.log('Photos array updated:', photos);
            updateGallery();
        }
    }
};

// Handle upload modal
document.getElementById('closeModal').addEventListener('click', () => {
    document.getElementById('uploadModal').style.display = 'none';
    document.getElementById('ratingSection').style.display = 'block';
    if (photos.length > 0) {
        displayImageForRating();
    }
});

// Handle file upload
document.getElementById('uploadForm').addEventListener('submit', (event) => {
    event.preventDefault();

    const formData = new FormData();
    const imageInput = document.getElementById('imageInput');
    for (let i = 0; i < imageInput.files.length; i++) {
        formData.append('images', imageInput.files[i]);
    }
    formData.append('clientId', clientId);

    fetch('/upload', { method: 'POST', body: formData })
        .then(() => {
            document.getElementById('uploadModal').style.display = 'none';
            document.getElementById('ratingSection').style.display = 'block';
        })
        .catch((err) => console.error(err));
});

// Handle ratings
document.querySelectorAll('.rateButton').forEach((button) => {
    button.addEventListener('click', () => {
        const rating = button.getAttribute('data-rating');
        const photo = photos[currentPhotoIndex];
        if (!ratedImages.has(photo.url)) {
            ws.send(JSON.stringify({ type: 'rateImage', index: currentPhotoIndex, rating, clientId }));
            ratedImages.add(photo.url);
            goToNextImage();
        }
    });
});

function displayImageForRating() {
    if (currentPhotoIndex < photos.length) {
        const photo = photos[currentPhotoIndex];
        const imageDiv = document.getElementById('currentImage');
        imageDiv.innerHTML = `<img src="${photo.url}" alt="Current Image" />`;
    } else {
        document.getElementById('currentImage').innerHTML = '<p>Done</p>';
    }
}

function updateGallery() {
    const gallery = document.getElementById('gallery');
    gallery.innerHTML = ''; // Clear the gallery
    photos.forEach(photo => {
        const averageRating = photo.ratings.length
            ? (photo.ratings.reduce((a, b) => a + b.rating, 0) / photo.ratings.length).toFixed(2)
            : 'No ratings yet';
        const imageDiv = document.createElement('div');
        imageDiv.className = 'image-item';
        imageDiv.innerHTML = `
            <img src="${photo.url}" alt="Uploaded Image" />
            <p class="ratingDisplay">Average Rating: ${averageRating}</p>
        `;
        gallery.appendChild(imageDiv);
    });
    // Update CSS grid to ensure it displays correctly
    gallery.style.gridTemplateColumns = `repeat(${Math.ceil(photos.length / 3)}, minmax(100px, 1fr))`;
    gallery.style.gridTemplateRows = `repeat(3, 1fr)`;
}

function goToNextImage() {
    currentPhotoIndex++;
    displayImageForRating();
}
