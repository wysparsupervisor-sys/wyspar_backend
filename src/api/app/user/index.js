const router = require("express").Router();

router.use("/me", require("./me/index"));
router.use("/viewer", require("./viewer/index"));

module.exports = router;