const jwt = require("jsonwebtoken");
const { PUBLIC_KEY, PRIVATE_KEY } = require("../../../secrets");
const SetCookie = require("../utils/cookie-setter");



const AppTokenAuthentication = async (req, res, next) => {
    const user_access_token = req.cookies["user_access_token"];
    const user_refresh_token = req.cookies["user_refresh_token"];
 
    if(!user_access_token) {
        SetCookie(res, "user_refresh_token", "", 0);
        return res.status(401).json({ok: false, msg: "Authentication Failed1"});
    };

    //try access token
    try {
        const decoded = jwt.verify(user_access_token, PUBLIC_KEY, { algorithms: ["RS256"] });
        req.user = { };
        req.user.ID = decoded.user_id;
        req.user.school = decoded.school;
        return next();
    } catch (err) {
        if (err.name !== "TokenExpiredError") {
            SetCookie(res, "user_access_token", "", 0);
            SetCookie(res, "user_refresh_token", "", 0);
            return res.status(401).json({ok: false, msg: "Authentication Failed1"});
        };
    };

    //acceess token expired try refresh token
    try {
        const decoded = jwt.verify(user_refresh_token, PUBLIC_KEY, { algorithms: ["RS256"] });

        //issue new access token
        const new_user_access_token = jwt.sign({ user_id: decoded.user_id, school: decoded.school }, PRIVATE_KEY, { algorithm: "RS256", expiresIn: "15m" });
        SetCookie(res, "user_access_token", new_user_access_token, 1000 * 60 * 60 * 24 * 365);

        req.user = {  };
        req.user.ID = decoded.user_id;
        req.user.school = decoded.school;
        return next();
    } catch (err) {
        SetCookie(res, "user_access_token", "", 0);
        SetCookie(res, "user_refresh_token", "", 0);
        return res.status(401).json({ok: false, msg: "Authentication Failed1"});
    };
};



module.exports = AppTokenAuthentication;