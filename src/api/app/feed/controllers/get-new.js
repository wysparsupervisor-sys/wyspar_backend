const { query, validationResult } = require("express-validator");
const pool = require("../../../../config/pg");

async function GetNew(req, res){
    await query("first_timestamp").exists().isISO8601().withMessage("").run(req);

    const errors = validationResult(req);
    if(!errors.isEmpty()) return res.status(400).json({ok: false, msg: errors.array({ onlyFirstError: true })[0].msg});
            
    const { first_timestamp } = req.query;    
    const user_id = req.user.ID;

    const BASE_SELECT = `
        SELECT p.post_id, p.content, p.post_type, p.post_category, p.post_style, p.images, p.location_status, p.total_upvote, p.total_downvote, p.total_love, p.total_view, p.total_comment, p.metadata, p.created_at, u.anonymous_name, u.details->'avatar' AS avatar, u.details->'profile_photo' AS profile_photo, u.school, COALESCE(l.value, 0) AS love_value, COALESCE(v.value, 0) AS vote_value FROM posts p
        JOIN users u ON u.user_id = p.user_id
        LEFT JOIN loves l ON l.post_id = p.post_id AND l.user_id = $1
        LEFT JOIN votes v ON v.post_id = p.post_id AND v.user_id = $1
        WHERE p.created_at > $2
    `;
    const ORDER_LIMIT = `ORDER BY created_at DESC LIMIT 10`;

    try {
        const result = await pool.query(`${BASE_SELECT} ${ORDER_LIMIT}`, [user_id, first_timestamp]);
        
        res.status(200).json({ok: true, body: result.rows});
    } catch (err) {
        console.log(err);
        return res.status(400).json({ok: false, msg: "Something went wrong. Try again!"});
    };
};

module.exports = GetNew;