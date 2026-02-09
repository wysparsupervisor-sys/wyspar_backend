const router = require("express").Router();


router.use("/comment", require("./comment/index"));
router.use("/whisper", require("./whisper/index"));


module.exports = router;