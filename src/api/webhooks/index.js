const router = require("express").Router();

router.use("/paystack", require("./paystack/index"));

module.exports = router;