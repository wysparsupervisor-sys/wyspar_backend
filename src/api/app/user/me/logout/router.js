const SetCookie = require("../../../../../lib/utils/cookie-setter");
const router = require("express").Router();

router.get("/", async (req, res) => {
    SetCookie(res, "user_access_token", "", 0);
    SetCookie(res, "user_refresh_token", "", 0);

    res.status(200).json({ok: true});
});


module.exports = router;