const ProcessAvatarEdit = require("./controllers/avatar");
const ProcessDescriptionEdit = require("./controllers/description");
const ProcessProfileBgEdit = require("./controllers/profile-bg");

const router = require("express").Router();


router.post("/", async (req, res) => {
    const { payload } = req.query;

    if (payload === "avatar") return ProcessAvatarEdit(req, res);
    if (payload === "description") return ProcessDescriptionEdit(req, res);
    if (payload === "profile-bg") return ProcessProfileBgEdit(req, res);

    return res.status(404).send("NOT FOUND");
});


module.exports = router;