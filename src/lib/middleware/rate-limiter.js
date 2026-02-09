const redisClient = require("../../config/redis");
const { v4: uuid } = require("uuid");
const setCookie = require("../utils/cookie-setter");
const jwt = require("jsonwebtoken");
const { PRIVATE_KEY, PUBLIC_KEY } = require("../../../secrets");



const RateLimiter = (options) => {
    return async (req, res, next) => {
        try {
            const { keyPrefix, maxRequests, windowSeconds, message = "Too many requests. Try again shortly!" } = options;
            let id = req.cookies["rate_limiter_id"] || req.ip; 

            if(!req.cookies["rate_limiter_id"]) {
                const token = jwt.sign({id: uuid()}, PRIVATE_KEY, {algorithm: "RS256", expiresIn: "10m"});
                setCookie(res, "rate_limiter_id", token, 1000 * 60 * 10);
            } else {
                try {
                    const decoded = jwt.verify(id, PUBLIC_KEY, {algorithms: ["RS256"]});
                    id = decoded.id;
                } catch (err) {
                    setCookie(res, "rate_limiter_id", "", 0);
                    return res.status(401).json({msg: 'Auth entication failed!', ok: false});
                };
            };
            
            const key = `${keyPrefix}:${id}`;
            const count = await redisClient.incr(key);
            //sets expiration on first request
            if (count === 1) await redisClient.expire(key, windowSeconds);
            if (count > maxRequests) return res.status(429).json({msg: message, ok: false});

            next();
        } catch (err) {
            console.log(err);
            res.status(400).json({msg: "Something went wrong. Try again!", ok: false});
        };
    };
};



module.exports = RateLimiter;