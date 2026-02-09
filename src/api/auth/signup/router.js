const router = require("express").Router();
const jwt = require("jsonwebtoken");
const ProcessOTP = require("./controllers/otp");
const ProcessPassword = require("./controllers/password");
const ProcessPersonalData = require("./controllers/personal-data");
const ResendOTP = require("./controllers/resend-otp");
const keys = require("../../../../secrets");
const RateLimiter = require("../../../lib/middleware/rate-limiter");



//rate-limiter middleware
const SignUpLimiter = RateLimiter({ keyPrefix: "SIGNUP:RATELIMITER", maxRequests: 20, windowSeconds: 60 });

router.post("/", SignUpLimiter, async (req, res) => {
    const { payload } = req.query;
    //parse request to different controller based on payload query
    if (payload === "personal-data") return ProcessPersonalData(req, res);


    //make sure user has a session-token after the initail payload is sent
    try {
        const token = req.cookies["signup_session_id"];
        if(!token) return res.status(400).json({ok: false, msg: "Authentication failed!"});

        const decoded = jwt.verify(token, keys.PUBLIC_KEY, { algorithms: ["RS256"] });
        if(!decoded.sessionID) return res.status(400).json({ok: false, msg: "Authentication failed!"});
        req.user = {};
        req.user.sessionID = decoded.sessionID;

    } catch (err) {
        console.log(err);
        return res.status(405).json({ok: false, msg: "Authentication failed!"});
    };


    //all these processes  require that user has beeen assigned an authentication token
    if (payload === "otp") return ProcessOTP(req, res);
    if (payload === "resend-otp") ResendOTP(req, res);
    if (payload === "password") return ProcessPassword(req, res);
});


module.exports = router;