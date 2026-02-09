const GetWhisper = require("./controller");
const router = require("express").Router();


router.get("/", GetWhisper);


module.exports = router;