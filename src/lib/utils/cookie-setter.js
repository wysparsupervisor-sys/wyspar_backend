

const SetCookie = async (res, name, value, maxAge, options = {}) => {
    const isProduction = process.env.NODE_ENV === "production";

    const defaults = {
        httpOnly: true,
        sameSite: isProduction ? "none" : "lax",
        path: "/",
        secure: isProduction,
        maxAge: maxAge,
        domain: isProduction ? ".wyspar.com" : undefined,
    };

    const cookieOptions = { ...defaults, ...options };
    res.cookie(name, value, cookieOptions);
};


module.exports = SetCookie;