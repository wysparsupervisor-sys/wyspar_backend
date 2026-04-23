const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");
const SetCookie = require("../../../../lib/utils/cookie-setter");
const redisClient = require("../../../../config/redis");
const MailTransporter = require("../../../../config/nodemailer");
const { body, validationResult } = require("express-validator");
const keys = require("../../../../../secrets");
const pool = require("../../../../config/pg");
const generateOTP = require("../../../../lib/utils/generate-otp");
const schools = require("../../../../lib/data/schools");
const APP_NAME = require("../../../../lib/data/app-name");
const AVATAR_STYLES = require("../../../../lib/data/avatar-styles");


const ProcessPersonalData =  async (req, res) => {
    try {
        //begin validation first
        const allowedSchools = schools.map(obj => obj.value);
        await body("school[0].value").exists().isIn(allowedSchools).withMessage("School you chose not found").run(req);
        await body("anonymous_name").exists().isString().isLength({ min: 3, max: 15 }).withMessage("Anonymous name must be larger than 3 characters and lower than 15").run(req);
        await body("gender").exists().isIn(["0", "1", 1, 0]).withMessage("Please choose a gender").run(req);
        await body("avatar.seed").exists().isString().notEmpty().isLength({max: 20}).withMessage("Try regenerating your avatar").run(req);
        await body("avatar.style").exists().isIn(AVATAR_STYLES).withMessage("Try regenerating your avatar").run(req);
        await body("email").exists().isEmail().normalizeEmail().withMessage("Enter a valid email address").run(req);

        //handle validation result
        const errors = validationResult(req);
        if(!errors.isEmpty()) return res.status(400).json({ok: false, msg: errors.array({ onlyFirstError: true })[0].msg});

        if (req.body.anonymous_name.toLowerCase() === "wyspar") return res.status(400).json({ok: false, msg: "Cannot use name"});


        //proceed with app logic
        let signup_data = req.body;

        //check if anonymous_name or email has been taken on DB
        const check_result = await pool.query(`SELECT CASE WHEN LOWER(anonymous_name) = LOWER($2) THEN 'anonymous_name_taken' WHEN email = $1 THEN 'email_taken' END AS conflict FROM users WHERE email = $1 OR anonymous_name = $2`, [signup_data.email, signup_data.anonymous_name.toLowerCase()]);
        const conflicts = check_result.rows.map(row => row.conflict);
        const taken = conflicts.filter(Boolean);
        if (taken.includes("anonymous_name_taken")) return res.status(200).json({ok: false, msg:"Anonymous name has been taken!"});
        if (taken.includes("email_taken")) return res.status(200).json({ok: false, msg: "Email is already in use by another user"});

        //generate session id and OTP for user
        const sessionID = uuidv4();
        signup_data.otp = generateOTP();

        //store user signup session on redis
        await redisClient.set(`SIGNUP:SESSIONID:${sessionID}`, JSON.stringify(signup_data), { EX: 30 * 60 });

        //use jwt & setCookie and respond to user if all goes well
        const token = jwt.sign({ sessionID: sessionID }, keys.PRIVATE_KEY, { algorithm: "RS256", expiresIn: "30min" })
        SetCookie(res, "signup_session_id", token, 30 * 60 * 1000);
        res.status(200).json({ok: true, msg: "successful"});
        
        try {
            //send email to user
            return await MailTransporter.sendMail({
                from: '"Wyspar Team" <app@wyspar.com>',
                to: signup_data.email,
                subject: `Welcome to ${APP_NAME}!`,
                html: `
                    <div style="border: 3px solid #5a0019ff; background-color: black; color: white; padding: 1rem; border-radius: 2rem;">                    
                        <h1 style="color: #0a6464ff;">${APP_NAME} 🎭</h1><br>
                        <p style="line-height: 1.6;">Hello 👋 <b style="color: white;">${signup_data.anonymous_name}</b>, thank you for aspiring to be a great member of our social community. A platform dedicated to promoting free speech and fun across the campus community.</p><br>
                        <p style="line-height: 1.6;">To proceed your code is <b>${signup_data.otp}</b>. Make sure to not share this number with anybody else. Thank you for complying!</p><br>
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



module.exports = ProcessPersonalData;