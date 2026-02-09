const { body, validationResult } = require("express-validator");
const pool = require("../../../config/pg");
const bcrypt = require("bcryptjs");
const { PRIVATE_KEY } = require("../../../../secrets");
const jwt = require("jsonwebtoken");
const SetCookie = require("../../../lib/utils/cookie-setter");



const ProcessLogin = async (req, res) => {
    try {
        //validate input
        await body("email").isString().isEmail().normalizeEmail().run(req);
        await body("password").isString().isLength({ min: 6 }).run(req);

        const errors = validationResult(req);
        if(!errors.isEmpty()) return res.status(200).json({ok: false, msg: "Incorrect email or password!"});

        const { password, email } = req.body;

        const result = await pool.query(`SELECT password, user_id, school FROM users WHERE email = $1 AND deleted = FALSE`, [email]);
        if (result.rows.length === 0) return res.status(200).json({ok: false, msg: "Incorrect email or password!"});
        const match = await bcrypt.compare(password, result.rows[0].password);
        if(!match) return res.status(200).json({ok: false, msg: "Incorrect email or password!"});

        //issue access token 
        const token = jwt.sign({user_id: result.rows[0].user_id, school: result.rows[0].school}, PRIVATE_KEY, { algorithm: "RS256", expiresIn: "15m"});
        SetCookie(res, "user_access_token", token, 1000 * 60 * 60 * 24 * 365);
 
        //issue refresh token 
        const token2 = jwt.sign({user_id: result.rows[0].user_id, school: result.rows[0].school}, PRIVATE_KEY, { algorithm: "RS256", expiresIn: "30d"});
        SetCookie(res, "user_refresh_token", token2, 1000 * 60 * 60 * 24 * 30);

        return res.status(200).json({ok: true, msg: "Success! Redirecting...."});
    } catch (err) {
        console.log(err);
        return res.status(400).json({ok: false, msg: "An internal server error occurred. Try again!"});
    };
};



module.exports = ProcessLogin;