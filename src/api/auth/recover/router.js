const keys = require("../../../../secrets");
const ProcessRecoveryEmail = require("./controllers/email");
const ProcessRecoveryOTP = require("./controllers/otp");
const jwt = require("jsonwebtoken");
const ProcessRecoveryPassword = require("./controllers/password");
const RateLimiter = require("../../../lib/middleware/rate-limiter");
const router = require("express").Router();

const RecoverLimiter = RateLimiter({ keyPrefix: "RECOVER:RATELIMITER", maxRequests: 20, windowSeconds: 60 });
router.post("/", RecoverLimiter, async (req, res) => {
    const { action } = req.query;
    if (action === "email") return ProcessRecoveryEmail(req, res);

    //get recovery session ID
    try {
        const token = req.cookies["recovery_session_id"];
        if(!token) return res.status(400).json({ok: false, msg: "Authentication failed!"});

        const decoded = jwt.verify(token, keys.PUBLIC_KEY, { algorithms: ["RS256"] });
        if(!decoded.sessionID) return res.status(400).json({ok: false, msg: "Authentication failed!"});
        req.recovery = {};
        req.recovery.sessionID = decoded.sessionID;

    } catch (err) {
        console.log(err);
        return res.status(405).json({ok: false, msg: "Authentication failed!"});
    };


    //request that need cookie
    if (action === "otp") return ProcessRecoveryOTP(req, res);
    if (action === "password") return ProcessRecoveryPassword(req, res);

    return res.status(404).send("NOT FOUND");
});


module.exports = router;