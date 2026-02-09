const pool = require("../../../../../../config/pg");

const GetSubscriptionData = async (req, res) => {
    const user_id = req.user.ID;

    try {
        const result = await pool.query(`SELECT expiry, is_processing FROM subscription WHERE user_id = $1`, [user_id]);
        const { expiry, is_processing } = result.rows[0];

        return res.status(200).json({ok: true, expiry: expiry, is_processing: is_processing});
    } catch (err) {
        console.log(err);
        return res.status(400).json({ok: false, msg: "Something went wrong. Try again!"});
    };
};


module.exports = GetSubscriptionData;