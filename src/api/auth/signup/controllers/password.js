const { body, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { PRIVATE_KEY } = require("../../../../../secrets");
const redisClient = require("../../../../config/redis");
const pool = require("../../../../config/pg");
const SetCookie = require("../../../../lib/utils/cookie-setter");
const { TrackEvent } = require("../../../../config/mixpanel");


//needs work still. Not perfectly secured

const ProcessPassword = async (req, res) => {
    const client = await pool.connect();
    try {
        //validate load
        await body("password").exists().isLength({ max: 20 }).isStrongPassword({ minLength: 6, minNumbers: 1, minLowercase: 0, minUppercase: 0, minSymbols: 0 }).withMessage("Password not strong enough!").run(req);
        const errors = validationResult(req);
        if(!errors.isEmpty()) return res.status(400).json({ok: false, msg: errors.array({ onlyFirstError: true })[0].msg});

        const { password } = req.body;
        
        //begin main logic
        const sessionID = req.user.sessionID;
        const signup_data = JSON.parse(await redisClient.get(`SIGNUP:SESSIONID:${sessionID}`));

        //check if otp_valid is true
        if(!signup_data.otp_valid) return res.status(403).json({ok: false, msg: "Action Forbidden!"});

        //set password as bycrpt
        signup_data.password = await bcrypt.hash(password, 14 /**salt rounds*/);
        const details = {avatar: {seed: signup_data.avatar.seed, style: signup_data.avatar.style}, profile_background: "fireflies", description: `Hey! 👋 I'm ${signup_data.anonymous_name} and I joined Wyspar 🎭 Its awesome, engaging, and fun!`};

        //store user data on DB
        await client.query("BEGIN");
        const db_query = `INSERT INTO users (email, password, school, anonymous_name, gender, details) VALUES ($1, $2, $3, $4, $5, $6) RETURNING user_id, school, anonymous_name`;
        const result = await client.query(db_query, [signup_data.email, signup_data.password, signup_data.school[0].value, signup_data.anonymous_name, signup_data.gender, details]);
        await redisClient.del([`SIGNUP:SESSIONID:${sessionID}`]);

        //created user subscription table
        await client.query(`INSERT INTO subscription (user_id) VALUES ($1)`, [result.rows[0].user_id]);
        await client.query("COMMIT");

        //issue access token
        const token = jwt.sign({user_id: result.rows[0].user_id, school: result.rows[0].school}, PRIVATE_KEY, { algorithm: "RS256", expiresIn: "15m"});
        SetCookie(res, "user_access_token", token,  1000 * 60 * 60 * 24 * 365);

        //issue refresh token
        const token2 = jwt.sign({user_id: result.rows[0].user_id, school: result.rows[0].school}, PRIVATE_KEY, { algorithm: "RS256", expiresIn: "30d"});
        SetCookie(res, "user_refresh_token", token2, 1000 * 60 * 60 * 24 * 30);
        
        res.status(200).json({ok: true, msg: "Signup successful!"});

        TrackEvent("User Signed Up", {
            distinct_id: result.rows[0].user_id,
            anonymous_name: result.rows[0].anonymous_name
        });
    } catch (err) {
        await client.query("ROLLBACK")
        console.log(err);
        res.status(400).json({ok: false, msg: "An internal server error occurred. Try again!"});
    } finally {
        client.release();
    };
};



module.exports = ProcessPassword;