const { TrackEvent } = require("../../../../../config/mixpanel");
const pool = require("../../../../../config/pg");
const SetCookie = require("../../../../../lib/utils/cookie-setter");
const router = require("express").Router();

router.get("/", async (req, res) => {
    const user_id = req.user.ID;
    try {
        //label user as deleted in postgres
        const db_query = `UPDATE users SET deleted = TRUE WHERE user_id = $1`;
        await pool.query(db_query, [user_id]);

        SetCookie(res, "user_access_token", "", 0);
        SetCookie(res, "user_refresh_token", "", 0);

        res.status(200).json({ok: true});

        TrackEvent("Deleted Account", {
            distinct_id: user_id,
        });
    } catch (err) {
        console.log(err);
        return res.status(400).json({ok: false});
    };
});


module.exports = router;