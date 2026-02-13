require("dotenv").config();
const express = require("express");
const cors = require("cors");
const constants = require("./domain");
const cookieParser = require("cookie-parser");
const Bootstrap = require("./src/bootstrap");
const AppTokenAuthentication = require("./src/lib/middleware/token-auth");
const SubscriptionAuth = require("./src/lib/middleware/subscription-auth");
const webpush = require("web-push");


    (async () => {
        try {
            await Bootstrap();
            //set vapid details
            webpush.setVapidDetails("mailto:wysparsupervisor@gmail.com", process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
        } catch (err) {
            return;
        };
        
        const app = express();
        

        //library level middleware
        app.use(cors({origin: constants.FRONTEND_URL, credentials: true}));
        app.use(cookieParser());
        app.use(express.json({ limit: '500kb' }));
        app.use(express.urlencoded({ extended: true, limit: '500kb' }));

        //app level middleware
        app.use("/app", AppTokenAuthentication);
        app.use("/app", SubscriptionAuth);

        //app routes
        app.use("/auth", require("./src/api/auth/index"));
        app.use("/app", require("./src/api/app/index"));
        app.use("/webhook", require("./src/api/webhooks/index"));

        const PORT = process.env.PORT || 5000;
        app.listen(PORT , "0.0.0.0", () => { console.log(`Server on process ${process.pid} listening on port ${PORT}`) });
    })();