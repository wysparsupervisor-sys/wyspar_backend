const router = require("express").Router();

router.use("/:anonymous_name/get", require("./get/router"));

module.exports = router;