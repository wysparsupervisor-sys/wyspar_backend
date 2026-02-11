const { TrackEvent } = require("../../../../../../config/mixpanel");

const DAU = async (req, res) => {
    const user_id = req.user.ID;

    TrackEvent("App Opened", {
        distinct_id: user_id,
        time: Date.now(),
    });

    res.status(200).json({ok: true});
};

module.exports = DAU;