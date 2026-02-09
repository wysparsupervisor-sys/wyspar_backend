const MailTransporter = require("../../../../config/nodemailer");
const redisClient = require("../../../../config/redis");
const APP_NAME = require("../../../../lib/data/app-name");
const generateOTP = require("../../../../lib/utils/generate-otp");



const ResendOTP = async (req, res) => {
    try {
        const sessionID = req.user.sessionID;
        let signup_data = JSON.parse(await redisClient.get(`SIGNUP:SESSIONID:${sessionID}`));

        //if otp has already been verified then prevent the fucking user from using resend
        if(signup_data.otp_valid) return res.status(403).json({ok: false, msg: "Action Forbidden!"});;

        const new_otp = generateOTP();
        signup_data.otp = new_otp;
        const email = signup_data.email;

        //add object for tracking number of resend
        if(!signup_data.otp_resend_num) signup_data.otp_resend_num = 0;
        signup_data.otp_resend_num++;
        if(signup_data.otp_resend_num >= 5) return res.status(200).json({ok: false, msg: "Too many resends. Wait patiently or restart signup!"});

        await redisClient.set(`SIGNUP:SESSIONID:${sessionID}`, JSON.stringify(signup_data), { EX: 30 * 60 });
        
        //send email to user
        await MailTransporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: `Welcome to ${APP_NAME} Again 😅!`,
            html: `
                <div style="border: 3px solid #5a0019ff; background-color: black; color: white; padding: 1rem; border-radius: 2rem;">                    
                    <h1 style="color: #0a6464ff;">${APP_NAME} 🎭</h1><br>
                    <p style="line-height: 1.6;">Hello 👋 <b style="color: white;">${signup_data.anonymous_name}</b>, thank you again for aspiring to be a great member of our social community. A platform as you know is dedicated to promoting free speech and fun across the campus community.</p><br>
                    <p style="line-height: 1.6;">To proceed your code is <b>${new_otp}</b>. Make sure to not share this number with anybody else. Thank you for complying!</p><br>
                </div>
            `
        });

        res.status(200).json({ok: true, msg: "OTP resent successfully"})
    } catch (err) {
        console.log(err);
        res.status(400).json({ok: false, msg: "An internal server error occurred. Try again!"})
    };
};



module.exports = ResendOTP;