// routes/user.js - VERIFICAR QUE SOLO EXISTA UNA RUTA /profile
const express = require('express');
const router = express.Router();
const ProfileController = require('../controllers/profileController');
const { requireAuth } = require('../middleware/auth');

// Rutas de vistas
router.get('/profile', requireAuth, ProfileController.showProfile);
router.get('/my-reviews', requireAuth, ProfileController.myReviews);
router.get('/purchase-history', requireAuth, ProfileController.purchaseHistory);
router.get('/membership', requireAuth, ProfileController.membership);

// ✅ SOLO UNA RUTA PUT /profile - VERIFICAR QUE NO HAY DUPLICADAS
router.put('/profile', requireAuth, ProfileController.updateProfile);
router.get('/profile/stats', requireAuth, ProfileController.getProfileStats);
router.post('/membership/purchase', requireAuth, ProfileController.purchaseMembership);
// routes/user.js - AÑADIR ESTA RUTA TEMPORAL
router.put('/profile/session', requireAuth, ProfileController.updateProfile);
module.exports = router;