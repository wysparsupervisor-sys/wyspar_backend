const pool = require("../../../config/pg");
const redisClient = require("../../../config/redis");
const POST_CATEGORIES = require("../../../lib/data/post-categories");
const schools = require("../../../lib/data/schools");

const ProcessFeed = async (req, res) => {
    const user_id = req.user.ID;
    const is_subscribed = req.subscription.is_subscribed;
    const redis_key = `USER:${user_id}:FREEFEED`;
    if (!is_subscribed) {
        const limited_feed = await redisClient.get(redis_key);
        if (limited_feed) {
            return res.status(200).json({ok: true, cause:"nosub", body: JSON.parse(limited_feed)});
        };
    };
    
    let { post_category } = req.query;
    const school = req.user.school;
    
    if(!POST_CATEGORIES.includes(post_category)){ 
        post_category = "*"
    } else { post_category = POST_CATEGORIES.indexOf(post_category) };
 
    
    let recent, trending, popular, old, chaos;

    try {
        recent = await getCachedFeeds("recent", post_category, school); //2 drom here
        trending = await getCachedFeeds("recent", post_category, school); //3 from here
        popular = await getCachedFeeds("popular", post_category, school); //3 from here
        old = await getCachedFeeds("recent", post_category, school);//1 from here
        chaos = await getCachedFeeds("recent", post_category, school);//1 from here totalling 10

        //combine based on ratios
        const joined_feed = [...recent, ...trending, ...popular, ...old, ...chaos];
        const unique = [...new Set(joined_feed)];

        if (!unique.length) return res.status(200).json({ok: false, msg: "Nothing in feed right now"});
        
        //query DB for posts
        const db_query = `
            SELECT p.post_id, p.content, p.post_type, p.post_category, p.post_style, p.images, p.location_status, p.total_upvote, p.total_downvote, p.total_love, p.total_view, p.total_comment, p.metadata, p.created_at, u.anonymous_name, u.details->'avatar' AS avatar, u.school, COALESCE(l.value, 0) AS love_value, COALESCE(v.value, 0) AS vote_value FROM unnest($1::uuid[]) AS ids(post_id)
            JOIN posts p ON p.post_id = ids.post_id
            JOIN users u ON u.user_id = p.user_id
            LEFT JOIN loves l ON l.post_id = p.post_id AND l.user_id = $2
            LEFT JOIN votes v ON v.post_id = p.post_id AND v.user_id = $2
            WHERE u.deleted = FALSE
        `;

        const result = await pool.query(db_query, [unique, req.user.ID]);
        if (!is_subscribed) {
            const limited_feed = JSON.stringify(result.rows);
            await redisClient.set(redis_key, limited_feed, { EX: 60 * 60 * 24 * 2 });
            return res.status(200).json({ok: true, cause:"nosub", body: result.rows});
        };
        return res.status(200).json({ok: true, body: result.rows});
    } catch (err) {
        console.log(err);
        res.status(400).json({ok: false, msg: "Something went wrong. Try again!"})
    };
};


module.exports = ProcessFeed;


async function getCachedFeeds(feed_cat, post_category="*", school="*", count = 1){
    try {
        const key = `feed:${feed_cat}:${school === "*" ? schools[Math.floor(Math.random() * schools.length)].value:school}:${post_category === "*" ? Math.floor(Math.random() * POST_CATEGORIES.length):post_category}`;
        const key2 = `feed:${feed_cat}:${school === "*" ? schools[Math.floor(Math.random() * schools.length)].value:school}:${post_category === "*" ? Math.floor(Math.random() * POST_CATEGORIES.length):post_category}`;

        const items = await redisClient.zRandMemberCount(key, count);
        const item2 = await redisClient.zRandMemberCount(key2, count);

        if(!items) return []; 
        return [...items, ...item2];
    } catch (err) {
        console.log(err);
        return [];
    };
};