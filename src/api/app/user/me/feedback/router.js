const ProcessFeedBack = require("./feedback");
const router = require("express").Router();

router.post("/", ProcessFeedBack);

module.exports = router;