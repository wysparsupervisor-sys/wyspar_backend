const crypto = require("crypto");


//OTP generator 
const generateOTP = (length=6) => {
    const buffer = crypto.randomBytes(length);
    let otp = '';
    for (let i = 0; i < buffer.length; i++) {
        otp += (buffer[i] % 10).toString();
    };
    return otp;
};


module.exports = generateOTP;