const router = require("express").Router();

router.use("/get", require("./get/router"));
router.use("/edit", require("./edit/router"));
router.use("/post", require("./post/router"));
router.use("/interaction", require("./interaction/router"));
router.use("/comment", require("./comment/router"));
router.use("/delete", require("./delete/router"));
router.use("/subscription", require("./subscription/router"));
router.use("/feedback", require("./feedback/router"));
router.use("/logout", require("./logout/router"));
router.use("/deleteaccount", require("./delete_account/router"));
router.use("/analytics", require("./analytics/router"));

module.exports = router;