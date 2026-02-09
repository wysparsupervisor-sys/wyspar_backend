const { body, validationResult } = require("express-validator");
const redisClient = require("../../../../config/redis");

const ProcessRecoveryOTP = async (req, res) => {
    await body("otp").exists().isString().isLength({ min: 8, max: 8 }).withMessage("One time password is incorrect").run(req);
    
    const errors = validationResult(req);
    if(!errors.isEmpty()) return res.status(400).json({ok: false, msg: errors.array({ onlyFirstError: true })[0].msg});

    const { otp } = req.body;
    const { sessionID } = req.recovery;

    try {
        let data = JSON.parse(await redisClient.get(`RECOVERY:SESSIONID:${sessionID}`));

        if (Number(data.otp) !== Number(otp)){
            return res.status(400).json({ok: false, msg: "Incorrect code"});
        } else {
            delete data.otp;
            data.otp_verified = true;
        };

        await redisClient.set(`RECOVERY:SESSIONID:${sessionID}`, JSON.stringify(data), { EX: 10 * 60 });
        return res.status(200).json({ok: true, msg: "success"});
    } catch (err) {
        console.log(err);
        res.status(400).json({ok: false, msg: "An internal server error occurred. Try again!"});
    };
};


module.exports = ProcessRecoveryOTP;