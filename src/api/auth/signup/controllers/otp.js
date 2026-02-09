const redisClient = require("../../../../config/redis");
const { body, validationResult } = require("express-validator");



const ProcessOTP = async (req, res) => {
    try {
        //authenticate object
        await body("otp").exists().isString().isLength({ min: 6, max: 6 }).withMessage("One time password is incorrect").run(req);

        const errors = validationResult(req);
        if(!errors.isEmpty()) return res.status(400).json({ok: false, msg: errors.array({ onlyFirstError: true })[0].msg});

        //if sessionID is successfully verified start main process
        const { otp } = req.body;
        const sessionID = req.user.sessionID;;
        let signup_data = JSON.parse(await redisClient.get(`SIGNUP:SESSIONID:${sessionID}`));

        //if otp has already been verified then prevent the fucking user from using this api again
        if(signup_data.otp_valid) return res.status(403).json({ok: false, msg: "Action Forbidden!"});;

        //check otp equality
        if (otp == signup_data.otp){
            delete signup_data.otp;
            signup_data.otp_valid = true;
            await redisClient.set(`SIGNUP:SESSIONID:${sessionID}`, JSON.stringify(signup_data), { EX: 10 * 60 });
            return res.status(200).json({ ok: true, msg: "successful" });
        } else {
            return res.status(400).json({ ok: false, msg: "One time password is incorrect" });
        };
    } catch (err) {
        console.log(err);
        res.status(400).json({ok: false, mag: "An internal server error occurred. Try again later!"})
    };
};



module.exports = ProcessOTP;