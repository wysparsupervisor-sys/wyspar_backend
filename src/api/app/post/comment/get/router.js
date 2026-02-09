const GetPostComments = require("./controller");
const router = require("express").Router();


router.get("/", GetPostComments);


module.exports = router;