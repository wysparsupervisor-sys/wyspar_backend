const { validationResult, body } = require("express-validator");
const pool = require("../../../../config/pg");
const { v4: uuidv4 } = require("uuid");
const generateOTP = require("../../../../lib/utils/generate-otp");
const jwt = require("jsonwebtoken");
const keys = require("../../../../../secrets");
const APP_NAME = require("../../../../lib/data/app-name");
const MailTransporter = require("../../../../config/nodemailer");
const SetCookie = require("../../../../lib/utils/cookie-setter");
const redisClient = require("../../../../config/redis");


const ProcessRecoveryEmail = async (req, res) => {
    await body("email").exists().isEmail().normalizeEmail().withMessage("Enter a valid email address").run(req);
    
    //handle validation result
    const errors = validationResult(req);
    if(!errors.isEmpty()) return res.status(400).json({ok: false, msg: errors.array({ onlyFirstError: true })[0].msg});

    const { email } = req.body;
    
    try {
        //check if email is associated with any existing account
        const result = await pool.query(`SELECT anonymous_name FROM users WHERE email = $1 AND deleted = FALSE`, [email]);
        const exists = result.rows.length > 0;

        if (!exists) return res.status(404).json({ok: false, msg: "No account is associated with the email address you provided"});

        //if it exists add recovery session cookie and store session on redis
        const sessionID = uuidv4();
        const otp = generateOTP(8);

        const data = {
            email,
            otp: otp,
            otp_verified: false,
        };

        //store user signup session on redis
        await redisClient.set(`RECOVERY:SESSIONID:${sessionID}`, JSON.stringify(data), { EX: 15 * 60 });
        const token = jwt.sign({ sessionID: sessionID }, keys.PRIVATE_KEY, { algorithm: "RS256", expiresIn: "15min" })
        SetCookie(res, "recovery_session_id", token, 15 * 60 * 1000);
        res.status(200).json({ok: true, msg: "successful"});

        try {
            //send email to client
            return await MailTransporter.sendMail({
                from: '"Wyspar Security" <app@wyspar.com>',
                to: email,
                subject: `${APP_NAME} noticed you forgot your password!`,
                html: `
                    <div style="border: 3px solid #5a0019ff; background-color: black; color: white; padding: 1rem; border-radius: 2rem;">                    
                        <h1 style="color: #0a6464ff;">${APP_NAME} 🎭</h1><br>
                        <p style="line-height: 1.6;">You told us you forgot your password <b>${result.rows[0].anonymous_name}</b>! Use this code to set a new password <b>${otp}</b>. If this wasn't you ignore and do not share the code with anyone ever!</p><br>
                    </div>
                `
            });
        } catch (error) {
            console.log(error);
        };
        
    } catch (err) {
        console.log(err);
        res.status(400).json({ok: false, msg: "An internal server error occurred. Try again!"});
    };
};


module.exports = ProcessRecoveryEmail;