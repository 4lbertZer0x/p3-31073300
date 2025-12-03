const express = require('express');
const router = express.Router();
const PurchaseController = require('../controllers/purchaseController');

// Si no tienes el middleware auth, usa esta versión simple:
const requireAuth = (req, res, next) => {
    if (req.session.user) {
        return next();
    }
    req.session.returnTo = req.originalUrl;
    return res.redirect('/auth/login');
};

// Rutas de compras
router.get('/purchase/movie/:id', PurchaseController.showMoviePurchasePage);
router.get('/purchase/checkout', PurchaseController.showPurchasePage);
router.post('/purchase/process-movie', requireAuth, PurchaseController.processMoviePurchase);
router.get('/purchase/success/:id', requireAuth, PurchaseController.showPurchaseSuccess);
router.get('/purchases', requireAuth, PurchaseController.getUserPurchases);

module.exports = router;