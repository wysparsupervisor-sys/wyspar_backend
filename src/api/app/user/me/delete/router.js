const ProcessCommentDelete = require("./controllers/comment");
const ProcessPostDelete = require("./controllers/post");
const router = require("express").Router();


router.post("/post", ProcessPostDelete);
router.post("/comment", ProcessCommentDelete);

 
module.exports = router;