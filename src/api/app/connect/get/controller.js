const { body, validationResult } = require("express-validator");
const pool = require("../../../../config/pg");

async function GetConnect(req, res){
    await body("connect_id").exists().isUUID().run(req);

    //handle validation result
    const errors = validationResult(req);
    if(!errors.isEmpty()) return res.status(400).json({ok: false, msg: errors.array({ onlyFirstError: true })[0].msg});

    try {
        const { connect_id } = req.body;

        const query = `
            SELECT c.connect_id, c.purpose, c.phone, c.location, c.extra, c.created_at, u.gender, u.details->'profile_background' AS profile_background, p.connect_description
            FROM connects c
            JOIN personalities p ON p.user_id = c.user_id
            JOIN users u ON u.user_id = c.user_id
            WHERE c.connect_id = $1
        `;

        const result = await pool.query(query, [connect_id]);
        return res.status(200).json({ok: true, body: result.rows[0]});
    } catch (err) {
        console.log(err);
        return res.status(400).json({ok: false, msg: "Something went wrong. Try again!"});
    };
};

module.exports = GetConnect;