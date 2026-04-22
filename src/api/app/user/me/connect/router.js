const ProcessConnect = require("./controller");
const router = require("express").Router();


router.post("/", ProcessConnect);


module.exports = router;