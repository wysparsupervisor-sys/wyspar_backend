const ProcessCommentDelete = require("./controllers/comment");
const ProcessConnectDelete = require("./controllers/connect");
const ProcessPostDelete = require("./controllers/post");
const router = require("express").Router();


router.post("/post", ProcessPostDelete);
router.post("/comment", ProcessCommentDelete);
router.post("/connect", ProcessConnectDelete);


module.exports = router;