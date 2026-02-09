require("dotenv").config();
const redis = require("redis");
const isProduction = process.env.NODE_ENV === "production";

//creates a redis client 
const redisClient = redis.createClient({
    url: isProduction ? process.env.REDIS_CONNECTION_STRING : "redis://localhost:6379",
    socket: {
        connectTimeout: 10000,
    },
});


redisClient.on("error", (err) => {
    console.error("Redis client err:", err);
});

(async () => {
    try {
        if(!redisClient.isOpen) {
            await redisClient.connect();
            console.log("Redis connected!");
        };
    } catch (err) {
        console.error("Failed to connect redis:", err);
    };
})();

//s
const shutDown = async () => {
    try {
        if(redisClient.isOpen) await redisClient.quit();
        console.log("Redis disconnected!");
    } catch (err) {
        console.err("Redis disconnection error:", err);
    };
};

process.on("SIGINT", shutDown);
process.on("SIGTERM", shutDown);



module.exports = redisClient;