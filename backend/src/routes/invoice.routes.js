const router = require('express').Router();
const ctrl = require('../controllers/invoice.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/next-number',       ctrl.nextNumber);
router.get('/reports/summary',   ctrl.reportSummary);
router.get('/number/:num',       ctrl.getByNumber);
router.get('/',                  ctrl.getAll);
router.get('/:id',               ctrl.getById);
router.post('/',                 ctrl.create);
router.put('/:id',               ctrl.update);
router.post('/:id/issue',        ctrl.issue);
router.post('/:id/cancel',       ctrl.cancel);
router.post('/:id/payments',     ctrl.addPayment);

module.exports = router;
