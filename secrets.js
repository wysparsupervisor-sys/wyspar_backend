require("dotenv").config()

// helper function to decode base64
const decodeKey = (key) => Buffer.from(key, "base64").toString("utf-8");


const keys = {
    PUBLIC_KEY: decodeKey(process.env.JWT_PUBLIC_KEY),
    PRIVATE_KEY: decodeKey(process.env.JWT_PRIVATE_KEY),
};


module.exports = keys;