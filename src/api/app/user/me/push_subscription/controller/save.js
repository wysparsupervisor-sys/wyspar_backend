const { body, validationResult } = require("express-validator");
const pool = require("../../../../../../config/pg");

const Save = async (req, res) => {
    await body("endpoint").exists().isURL().run(req);
    await body("keys.auth").exists().isString().run(req);
    await body("keys.p256dh").exists().isString().run(req);
    //handle validation result
    const errors = validationResult(req);
    if(!errors.isEmpty()) return res.status(400).json({ok: false});
    
    const { endpoint, keys } = req.body;
    const  { auth, p256dh } = keys;
    const user_id = req.user.ID;
    const db_query = `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth) VALUES ($1, $2, $3, $4)`;

    try {
        await pool.query(db_query, [user_id, endpoint, p256dh, auth]);
        return res.status(200).json({ok: true});
    } catch (err) {
        console.log(err);
        return res.status(400).json({ok: false});
    };
};


module.exports = Save;