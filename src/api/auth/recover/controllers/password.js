const { body, validationResult } = require("express-validator");
const redisClient = require("../../../../config/redis");
const bcrypt = require("bcryptjs");
const pool = require("../../../../config/pg");
const SetCookie = require("../../../../lib/utils/cookie-setter");
const { PRIVATE_KEY } = require("../../../../../secrets");
const jwt = require("jsonwebtoken");


const ProcessRecoveryPassword = async (req, res) => {
    //validate load
    await body("password").exists().isLength({ max: 20 }).isStrongPassword({ minLength: 6, minNumbers: 1, minLowercase: 0, minUppercase: 0, minSymbols: 0 }).withMessage("Password not strong enough!").run(req);
    const errors = validationResult(req);
    if(!errors.isEmpty()) return res.status(400).json({ok: false, msg: errors.array({ onlyFirstError: true })[0].msg});

    const { password } = req.body;
    const { sessionID } = req.recovery;

    try {
        const data = JSON.parse(await redisClient.get(`RECOVERY:SESSIONID:${sessionID}`));
        if (!data.otp_verified) return res.status(403).json({ok: false, msg: "Action terminated!"});

        const password_hash = await bcrypt.hash(password, 14);
        const db_query  = `UPDATE users SET password = $1 WHERE email = $2 RETURNING user_id, school`;
        const result = await pool.query(db_query, [password_hash, data.email]);
        const { user_id, school } = result.rows[0];

        //issue access token
        const token = jwt.sign({user_id: user_id, school: school}, PRIVATE_KEY, { algorithm: "RS256", expiresIn: "15m"});
        SetCookie(res, "user_access_token", token,  1000 * 60 * 60 * 24 * 365);

        //issue refresh token
        const token2 = jwt.sign({user_id: user_id, school: school}, PRIVATE_KEY, { algorithm: "RS256", expiresIn: "30d"});
        SetCookie(res, "user_refresh_token", token2, 1000 * 60 * 60 * 24 * 30);
        
        //delete rediskey 
        await redisClient.del([`RECOVERY:SESSIONID:${sessionID}`]);
        return res.status(200).json({ok: true, msg: "Successful. redirecting!"});
    } catch (err) {
        console.log(err);
        res.status(400).json({ok: false, msg: "An internal server error occurred. Try again!"});
    };
};


module.exports = ProcessRecoveryPassword;