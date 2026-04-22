const router = require("express").Router();
const RateLimiter = require("../../lib/middleware/rate-limiter");


 
const UserRateLimit = RateLimiter({kePrefix:"USERAPI", windowSeconds: 60, maxRequests: 30});
router.use("/user", UserRateLimit, require("./user/index"));

const PostRateLimit = RateLimiter({kePrefix:"POSTAPI", windowSeconds: 60, maxRequests: 30});
router.use("/post", PostRateLimit, require("./post/index"));

const ConnectRateLimit = RateLimiter({kePrefix:"CONNECTAPI", windowSeconds: 60, maxRequests: 30});
router.use("/connect", ConnectRateLimit, require("./connect/index"));

const FeedRateLimit = RateLimiter({kePrefix:"FEEDAPI", windowSeconds: 60, maxRequests: 30});
router.use("/feed", FeedRateLimit, require("./feed/index"));

const SearchRateLimit = RateLimiter({kePrefix:"SEARCHAPI", windowSeconds: 60, maxRequests: 30});
router.use("/search", SearchRateLimit, require("./search/index"));

const ConnectFeedRateLimit = RateLimiter({kePrefix:"SEARCHAPI", windowSeconds: 60, maxRequests: 30});
router.use("/connect_feed", ConnectFeedRateLimit, require("./connect_feed/index"));


module.exports = router;