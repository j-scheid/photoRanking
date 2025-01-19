// Dynamically determine WebSocket URL based on environment
const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
const ws = new WebSocket(`${protocol}://${location.host}`);

let clientId = null;
let currentPhotoIndex = 0;
let uploadedImages = [];
let ratedImages = new Set();

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === 'welcome') {
        clientId = data.clientId;
        console.log(`Assigned Client ID: ${clientId}`);
        document.getElementById('uploadModal').style.display = 'block';
    }

    if (data.type === 'newImage') {
        uploadedImages.push(data.imageUrl);
        if (uploadedImages.length === 1) {
            displayImageForRating();
        }
        updateGallery(data.imageUrl, 0); // Initialize with 0 rating
    }

    if (data.type === 'updateRating') {
        updateGallery(data.imageUrl, data.averageRating);
    }
};

// Handle upload modal
document.getElementById('closeModal').addEventListener('click', () => {
    document.getElementById('uploadModal').style.display = 'none';
    document.getElementById('ratingSection').style.display = 'block';
    if (uploadedImages.length > 0) {
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
        const imageUrl = uploadedImages[currentPhotoIndex];
        if (!ratedImages.has(imageUrl)) {
            ws.send(JSON.stringify({ type: 'rateImage', index: currentPhotoIndex, rating }));
            ratedImages.add(imageUrl);
            goToNextImage();
        }
    });
});

function displayImageForRating() {
    if (currentPhotoIndex < uploadedImages.length) {
        const imageUrl = uploadedImages[currentPhotoIndex];
        const imageDiv = document.getElementById('currentImage');
        imageDiv.innerHTML = `<img src="${imageUrl}" alt="Current Image" />`;
    } else {
        document.getElementById('currentImage').innerHTML = '<p>Done</p>';
    }
}

function updateGallery(imageUrl, averageRating) {
    const gallery = document.getElementById('gallery');
    if (gallery) {
        let imageDiv = Array.from(gallery.children).find(
            (div) => div.querySelector('img').src === imageUrl
        );
        if (!imageDiv) {
            imageDiv = document.createElement('div');
            gallery.appendChild(imageDiv);
        }
        const ratingDisplay = imageDiv.querySelector('.ratingDisplay');
        if (ratingDisplay) {
            ratingDisplay.textContent = averageRating === 0
                ? 'No ratings yet'
                : `Average Rating: ${averageRating.toFixed(2)}`;
        } else {
            imageDiv.innerHTML = `
                <img src="${imageUrl}" alt="Uploaded Image" />
                <p class="ratingDisplay">${averageRating === 0 ? 'No ratings yet' : `Average Rating: ${averageRating.toFixed(2)}`}</p>
            `;
        }
    }
}

function goToNextImage() {
    currentPhotoIndex++;
    displayImageForRating();
}
