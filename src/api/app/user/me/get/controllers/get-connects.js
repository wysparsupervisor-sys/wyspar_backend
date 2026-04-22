const pool = require("../../../../../../config/pg");

const GetConnects = async (req, res) => {
    const user_id = req.user.ID;

    try {
        const result = await pool.query(`SELECT c.connect_id, c.purpose, c.phone, c.location, c.extra, c.created_at, u.details->'profile_background' AS profile_background FROM connects c JOIN users u ON u.user_id = c.user_id WHERE u.user_id = $1 ORDER BY c.created_at DESC`, [user_id]);
        return res.status(200).json({body: result.rows, ok: true});
    } catch (err) {
        console.log(err);
        return res.status(400).json({ok: false, msg: "Something went wrong. Try again!"});
    };
};


module.exports = GetConnects;