const GetDiscoveredConnects = require("./controllers/discover");
const GetConnectFeed = require("./controllers/personalized");
const GetSimilarConnects = require("./controllers/similar");
const router = require("express").Router();

router.get("/", async (req, res) => {
    try {
        const { action } = req.query;

        if(action === "personalized") return GetConnectFeed(req, res);
        if(action === "similar") return GetSimilarConnects(req, res);
        if(action === "discover") return GetDiscoveredConnects(req, res);

        return res.status(404).send("NOT FOUND");
    } catch (error) {
        return res.status(404).send("NOT FOUND");
    };
});

module.exports = router;