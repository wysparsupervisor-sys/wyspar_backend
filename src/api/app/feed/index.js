const ProcessFeed = require("./controller");
const router = require("express").Router();

router.get("/", ProcessFeed);

module.exports = router;