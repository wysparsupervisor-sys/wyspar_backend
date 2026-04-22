const { validationResult, query } = require("express-validator");
const { embed } = require("../../../../config/embedder");
const pool = require("../../../../config/pg");
const redisClient = require("../../../../config/redis");

const GetSimilarConnects = async (req, res) => {
    const is_subscribed = req.subscription.is_subscribed;
    if(!is_subscribed) return res.status(200).json({ok: true, cause:"nosub"});

    await query("purpose").exists().isString().isLength({min: 5, max: 60}).run(req);
    await query("connect_id").exists().isString().isUUID().run(req);

    //handle validation result
    const errors = validationResult(req);
    if(!errors.isEmpty()) return res.status(400).json({ok: false, msg: errors.array({ onlyFirstError: true })[0].msg});

    try {
        const { purpose, connect_id } = req.query;
        const { school } = req.user;
        const user_id = req.user.ID;

        //check if it's been cached in redis
        const similar_connects_cache = await redisClient.get(`SIMILAR_CONNECTS_CACHE:${connect_id}`);
        if(similar_connects_cache) return res.status(200).json({ok: true, body: JSON.parse(similar_connects_cache)});  

        const embedding = await embed(purpose);
        const db_suitable_embedding = "[" + embedding.join(",") + "]";

        const results = await pool.query(`
            SELECT c.connect_id, c.purpose, c.phone, c.location, c.extra, c.created_at, u.gender, u.details->'profile_background' AS profile_background, p.connect_description
            FROM connects c
            JOIN users u ON u.user_id = c.user_id
            JOIN personalities p ON p.user_id = c.user_id
            WHERE u.school = $2
            AND c.user_id != $4
            AND c.connect_id != $3
            ORDER BY c.embedding <=> $1
            LIMIT 10
        `, [db_suitable_embedding, school, connect_id, user_id]); 

        //store in redis for caching for 1 day
        await redisClient.set(`SIMILAR_CONNECTS_CACHE:${connect_id}`, JSON.stringify(results.rows), { EX: 60 * 60 * 24 });
        return res.status(200).json({ok: true, body: results.rows});    
        
    } catch (err) {
        console.log(err);
        res.status(400).json({ok: false, msg: "Something went wrong. Try again!"})
    };
};


module.exports = GetSimilarConnects;