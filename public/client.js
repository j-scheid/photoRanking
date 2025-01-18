const ws = new WebSocket(`ws://${location.host}`);
let clientId = null;
let currentPhotoIndex = 0;
let uploadedImages = [];

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
    formData.append('image', imageInput.files[0]);
    formData.append('clientId', clientId);

    fetch('/upload', { method: 'POST', body: formData })
        .then((response) => response.text())
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
        ws.send(JSON.stringify({ type: 'rateImage', index: currentPhotoIndex, rating }));
    });
});

function displayImageForRating() {
    const imageUrl = uploadedImages[currentPhotoIndex];
    const imageDiv = document.getElementById('currentImage');
    imageDiv.innerHTML = `<img src="${imageUrl}" alt="Current Image" />`;
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
        imageDiv.innerHTML = `
            <img src="${imageUrl}" alt="Uploaded Image" />
            <p>Average Rating: ${averageRating.toFixed(2)}</p>
        `;
    }
}
