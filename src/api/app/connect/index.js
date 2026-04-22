const router = require("express").Router();


router.use("/get", require("./get/router"));


module.exports = router;