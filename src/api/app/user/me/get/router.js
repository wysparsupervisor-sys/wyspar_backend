const router = require("express").Router();
const GetPosts = require("./controllers/get-posts");
const GetUserLocationStatus = require("./controllers/location-status");
const GetUserProfileData = require("./controllers/profile-data");


router.get("/", async (req, res) => {
    const { payload } = req.query;

    if(!payload) return await GetUserProfileData(req, res);
    if(payload === "location-status") return await GetUserLocationStatus(req, res);
    if(payload === "get-posts") return await GetPosts(req, res);
});


module.exports = router;