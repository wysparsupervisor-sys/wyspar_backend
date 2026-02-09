const ProcessInteraction = require("./controller");
const router = require("express").Router();


router.post("/", ProcessInteraction);


module.exports = router;