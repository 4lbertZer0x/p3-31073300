// Funcionalidades generales del sitio
document.addEventListener('DOMContentLoaded', function() {
    console.log('CineCríticas cargado correctamente');
    
    // Manejo de ratings en formularios
    const ratingInputs = document.querySelectorAll('input[name="rating"]');
    ratingInputs.forEach(input => {
        input.addEventListener('change', function() {
            updateRatingDisplay(this.value);
        });
    });
});

function updateRatingDisplay(rating) {
    // Actualizar visualización de estrellas
    const stars = document.querySelectorAll('.rating-option .star');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.style.color = '#f39c12';
        } else {
            star.style.color = '#ddd';
        }
    });
}

// Manejo de modales
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function openModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}