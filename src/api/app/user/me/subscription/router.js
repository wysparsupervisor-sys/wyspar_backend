const GetSubscriptionData = require("./controllers/get-sub-data");
const InitializeUserSubscription = require("./controllers/initialize");
const VerifyUserSubscription = require("./controllers/verify");
const router = require("express").Router();


router.post("/", async (req, res) => {
    const { action } = req.query;

    if (action === "initialize") return await InitializeUserSubscription(req, res);
    if (action === "verify") return await VerifyUserSubscription(req, res);
    if (action === "get-data") return await GetSubscriptionData(req, res);

    return res.status(404).send("NOT FOUND");
});


module.exports = router;