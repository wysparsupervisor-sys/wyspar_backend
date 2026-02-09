const router = require("express").Router();


router.use("/login", require("./login/router"));
router.use("/signup", require("./signup/router"));
router.use("/recover", require("./recover/router"));


module.exports = router;