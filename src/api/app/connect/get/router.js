const GetConnect = require("./controller");
const router = require("express").Router();


router.post("/", GetConnect);


module.exports = router;