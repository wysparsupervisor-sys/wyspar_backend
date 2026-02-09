const RateLimiter = require("../../../lib/middleware/rate-limiter");
const ProcessLogin = require("./controller");
const router = require("express").Router();


const LoginLimiter = RateLimiter({keyPrefix: "LOGIN:RATELIMITER", maxRequests: 3, windowSeconds: 30 });
router.post("/", LoginLimiter, ProcessLogin);


module.exports = router;