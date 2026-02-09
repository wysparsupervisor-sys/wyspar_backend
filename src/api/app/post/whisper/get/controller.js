const { query, validationResult } = require("express-validator");
const pool = require("../../../../../config/pg");

const GetWhisper = async (req, res) => {
    const is_subscribed = req.subscription.is_subscribed;
    if(!is_subscribed) return res.status(200).json({ok: false, cause: "nosub"});

    await query("post_id").exists().isUUID().run(req);
    //handle validation result
    const errors = validationResult(req);
    if(!errors.isEmpty()) return res.status(400).json({ok: false, msg: errors.array({ onlyFirstError: true })[0].msg});
        
    const { post_id } = req.query;
    const user_id = req.user.ID;

    const db_query = `
        SELECT p.post_id, p.content, p.post_type, p.post_category, p.post_style, p.images, p.location_status, p.total_upvote, p.total_downvote, p.total_love, p.total_view, p.total_comment, p.metadata, p.created_at, u.anonymous_name, u.details->'avatar' AS avatar, u.school, COALESCE(l.value, 0) AS love_value, COALESCE(v.value, 0) AS vote_value FROM posts p
        JOIN users u ON u.user_id = p.user_id
        LEFT JOIN loves l ON l.post_id = p.post_id AND l.user_id = $2
        LEFT JOIN votes v ON v.post_id = p.post_id AND v.user_id = $2
        WHERE p.post_id = $1 AND u.deleted = FALSE
    `;

    try {
        const result = await pool.query(db_query, [post_id, user_id]);
        return res.status(200).json({ok: true, body: result.rows});
    } catch (err) {
        console.log(err);
        return res.status(400).json({ok: false, msg: "Something went wrong. Try again!"});
    };
};


module.exports = GetWhisper;