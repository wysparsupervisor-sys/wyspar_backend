const crypto = require("crypto");



const generateSignedUrl = (expiresInSec) => {
    //extract timestamp
    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSec;
    const payload = expiresAt.toString();
    const signature = crypto.createHmac("sha256", process.env.SIGNED_URL_SECRET).update(payload).digest("hex");

    return {sig: signature, exp: expiresAt};
};



module.exports = generateSignedUrl;