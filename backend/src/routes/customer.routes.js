const router = require('express').Router();
const ctrl = require('../controllers/customer.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/',           ctrl.getAll);
router.get('/:id/invoices', ctrl.getInvoices);
router.get('/:id',        ctrl.getById);
router.post('/',          ctrl.create);
router.put('/:id',        ctrl.update);
router.delete('/:id',     ctrl.remove);

module.exports = router;
