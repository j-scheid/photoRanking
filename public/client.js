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

// Handle modal visibility
const uploadModal = document.getElementById('uploadModal');
const ratingSection = document.getElementById('ratingSection');
const closeModalButton = document.getElementById('closeModal');
const uploadForm = document.getElementById('uploadForm');
const imageInput = document.getElementById('imageInput');
const currentImageDiv = document.getElementById('currentImage');
const rateButtons = document.querySelectorAll('.rateButton');


// Open modal on load (simulate app initialization)
window.onload = () => {
    uploadModal.classList.add('active');
    ratingSection.style.display = 'none';
};

// Close modal and show rating section
closeModalButton.addEventListener('click', () => {
    uploadModal.classList.remove('active');
    ratingSection.style.display = 'block';
    if (photos.length > 0) {
        displayImageForRating();
    }
});

// Handle file upload
uploadForm.addEventListener('submit', (event) => {
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
rateButtons.forEach((button) => {
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

// Display the current image for rating
function displayImageForRating() {
    if (currentPhotoIndex < photos.length) {
        const photo = photos[currentPhotoIndex];
        currentImageDiv.innerHTML = `<img src="${photo.url}" alt="Current Image" class="responsive-image" />`;
    } else {
        currentImageDiv.innerHTML = '<p>All images have been rated. Thank you!</p>';
    }
}

// Move to the next image
function goToNextImage() {
    currentPhotoIndex++;
    if (currentPhotoIndex < photos.length) {
        displayImageForRating();
    } else {
        currentImageDiv.innerHTML = '<p>All images have been rated. Thank you!</p>';
    }
}


function updateGallery() {
    const gallery = document.getElementById('gallery');
    gallery.innerHTML = ''; // Clear the gallery

    // Add images to the gallery
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

    // Dynamically adjust the grid
    const containerWidth = gallery.clientWidth;
    const containerHeight = gallery.clientHeight;
    const totalPhotos = photos.length;

    // Calculate rows and columns to maintain a balanced grid
    const columns = Math.ceil(Math.sqrt(totalPhotos * (containerWidth / containerHeight)));
    const rows = Math.ceil(totalPhotos / columns);

    gallery.style.display = 'grid';
    gallery.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
    gallery.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
    gallery.style.gap = '5px'; // Optional spacing between items
}


function goToNextImage() {
    currentPhotoIndex++;
    displayImageForRating();
}
