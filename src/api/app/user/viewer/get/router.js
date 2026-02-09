const GetPostsViewer = require("./controllers/get-posts");
const GetProfileViewer = require("./controllers/get-profile");
const router = require("express").Router({mergeParams: true});


router.get("/", async (req, res) => {
    const { action } = req.query;
    const is_subscribed = req.subscription.is_subscribed;
    if(!is_subscribed) return res.status(200).json({ok: false, cause:"nosub"});

    if (action === "profile-data") return GetProfileViewer(req, res);
    if (action === "posts") return GetPostsViewer(req, res);

    return res.status(404).send("NOT FOUND");
});


module.exports = router;