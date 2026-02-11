const { body, validationResult } = require("express-validator");
const POST_STYLES = require("../../../../../../lib/data/post-styles");
const pool = require("../../../../../../config/pg");
const POST_TYPES = require("../../../../../../lib/data/post-types");
const POST_CATEGORIES = require("../../../../../../lib/data/post-categories");
const LOCATION_CLASSES = require("../../../../../../lib/data/location-classes");
const { embed } = require("../../../../../../config/embedder");
const { TrackEvent } = require("../../../../../../config/mixpanel");

const ProcessStatementPost = async (req, res) => {
    //valiadate inputs
    await body("text").exists().isString().isLength({max: 180, min: 3}).withMessage("").run(req);
    await body("style").exists().isString().isIn(POST_STYLES).withMessage("").run(req);
    //handle validation result
    const errors = validationResult(req);
    if(!errors.isEmpty()) return res.status(400).json({ok: false, msg: "Invalid request body!"});

    const user_id = req.user.ID;
    const location_status = req.user.location_status;
    const { text, type, category, style } = req.body;


    //prepare a client cause operation must be atomic
    const client = await pool.connect();
        
    try {
        //extract embedding from xenova
        const post_vector = await embed(text);
        
        //increment user total post counter by 1 then store post on DB
        const post_query = `INSERT INTO posts (user_id, content, post_type, post_style, post_category, location_status, embedding) VALUES ($1, $2, $3, $4, $5, $6, $7::vector) RETURNING post_id, content, post_type, post_category, post_style, images, location_status, total_upvote, total_downvote, total_love, total_view, total_comment, metadata, created_at`;
        const increment_query = `UPDATE users SET stats = jsonb_set(stats, '{posts}', ((stats->>'posts')::int + 1)::text::jsonb) WHERE user_id = $1`;

        await client.query("BEGIN");
        const result = await client.query(post_query, [user_id, text, POST_TYPES.indexOf(type), POST_STYLES.indexOf(style), POST_CATEGORIES.indexOf(category), LOCATION_CLASSES.indexOf(location_status), '['+ post_vector.join(',') + ']']);
        await client.query(increment_query, [user_id]);
        await client.query("COMMIT");

        res.status(200).json({ok: true, msg: "success", post_info: result.rows[0]});
        TrackEvent('Post Created', {
            distinct_id: user_id,
            time: new Date().toISOString(),
        });
    } catch (err) {
        await client.query("ROLLBACK")
        console.log(err);
        return res.status(400).json({ok: false, msg: "Something went wrong. Try again!"});
    } finally {
        client.release();
    };
};


module.exports = ProcessStatementPost;