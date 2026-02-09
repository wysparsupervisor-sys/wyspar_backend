const router = require("express").Router();

router.use("/subscription", require("./controllers/subscription"));

module.exports = router;