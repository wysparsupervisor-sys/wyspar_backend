const pool = require("../../../../../../config/pg");


const GetUserProfileData = async (req, res) => {
    try {
        const user_id = req.user.ID;
        const result = await pool.query(`SELECT anonymous_name, gender, school, details, stats FROM users WHERE user_id = $1`, [user_id]);
        return res.status(200).json({ok: true, body: result.rows[0]});
    } catch (err) {
        console.log(err);
        return res.status(400).json({ok: false, msg: "Something went wrong. Try again!"});
    };
};



module.exports = GetUserProfileData;