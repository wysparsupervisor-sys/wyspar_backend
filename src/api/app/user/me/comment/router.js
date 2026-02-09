const ProcessComment = require("./controller");
const router = require("express").Router();


router.post("/", ProcessComment);


module.exports = router;