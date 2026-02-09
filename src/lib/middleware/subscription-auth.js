const pool = require("../../config/pg");
const redisClient = require("../../config/redis");
const SetCookie = require("../utils/cookie-setter");


const SubscriptionAuth = async (req, res, next) => {
    const user_id = req.user.ID;
    const expiry = await redisClient.get(`USER:${user_id}:EXPIRY`);

    try {
        if(!expiry) {
            //set expriry for user in rediscache
            const db_query = await pool.query(`SELECT expiry FROM subscription WHERE user_id = $1`, [user_id]);
            if(!db_query.rows.length) {
                SetCookie(res, "user_access_token", "", 0);
                SetCookie(res, "user_refresh_token", "", 0);
                return res.status(401).json({ok: false, msg: "Authentication Failed1"});
            };

            //else add redis key and set subscription object
            const next_expiry = db_query.rows[0].expiry.toISOString();

            //add to redis for 5days
            await redisClient.set(`USER:${user_id}:EXPIRY`, next_expiry, { EX: 60 * 60 * 24 * 5 });
            
            //compute expiration
            const hasExpired = new Date() > new Date(next_expiry);
 
            req.subscription = {
                is_subscribed: !hasExpired,
            };

            next();
        } else {
            const hasExpired = new Date() > new Date(expiry);
            req.subscription = {
                is_subscribed: !hasExpired,
            };
            next();
        }
    } catch (err) {
        
    };
};


module.exports = SubscriptionAuth;