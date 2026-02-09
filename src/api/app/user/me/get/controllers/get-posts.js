const { query, validationResult } = require("express-validator");
const pool = require("../../../../../../config/pg");
const POST_CATEGORIES = require("../../../../../../lib/data/post-categories");

const GetPosts = async (req, res) => {
    await query("lastCreatedAt").optional().isISO8601().withMessage("").run(req);
    await query("postCategory").exists().isIn([...POST_CATEGORIES, "all"]).withMessage("").run(req);

    //handle validation result
    const errors = validationResult(req);
    if(!errors.isEmpty()) return res.status(400).json({ok: false, msg: "Invalid query object"});
 
    const user_id = req.user.ID;
    const { lastCreatedAt, postCategory } = req.query;
    
    //the limit is 5 because the profile page is the default most users actually want to navigate elsewhere and not scroll so it's best to keep it as little as 5
    const BASE_SELECT = `
        SELECT p.post_id, p.content, p.post_type, p.post_category, p.post_style, p.images, p.location_status, p.total_upvote, p.total_downvote, p.total_love, p.total_view, p.total_comment, p.metadata, p.created_at, COALESCE(l.value, 0) AS love_value, COALESCE(v.value, 0) AS vote_value FROM posts p
        LEFT JOIN loves l ON l.post_id = p.post_id AND l.user_id = $1
        LEFT JOIN votes v ON v.post_id = p.post_id AND v.user_id = $1
        WHERE p.user_id = $1 AND ($2::int IS NULL OR p.post_category = $2::int)
    `;
    const ORDER_LIMIT = `ORDER BY created_at DESC LIMIT 5`;


    try {
        let result;

        if(!lastCreatedAt) {
            result = await pool.query(`${BASE_SELECT} ${ORDER_LIMIT}`, [user_id, ...(postCategory === "all" ? [null]:[POST_CATEGORIES.indexOf(postCategory)] )]);
        } else {
            result = await pool.query(`${BASE_SELECT} AND p.created_at < $3 ${ORDER_LIMIT}`, [user_id, ...(postCategory === "all" ? [null]:[POST_CATEGORIES.indexOf(postCategory)] ), lastCreatedAt]);
        };
        
        res.status(200).json({ok: true, body: result.rows});
    } catch (err) {
        console.log(err);
        return res.status(400).json({ok: false, msg: "Something went wrong. Try again!"});
    };
};


module.exports = GetPosts;