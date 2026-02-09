const { query, validationResult, param } = require("express-validator");
const pool = require("../../../../../../config/pg");
const POST_CATEGORIES = require("../../../../../../lib/data/post-categories");


const GetPostsViewer = async (req, res) => {
    await query("lastCreatedAt").optional().isISO8601().withMessage("").run(req);
    await query("postCategory").exists().isIn([...POST_CATEGORIES, "all"]).withMessage("").run(req);
    await param("anonymous_name").exists().isString().isLength({min: 3, max: 15}).withMessage("").run(req);

    //handle validation result
    const errors = validationResult(req);
    if(!errors.isEmpty()) return res.status(400).json({ok: false, msg: "Invalid query object"});
 
    const user_id = req.user.ID;
    const { anonymous_name } = req.params;
    const { lastCreatedAt, postCategory } = req.query;
    
    const BASE_SELECT = `
        SELECT p.post_id, p.content, p.post_type, p.post_category, p.post_style, p.images, p.location_status, p.total_upvote, p.total_downvote, p.total_love, p.total_view, p.total_comment, p.metadata, p.created_at, COALESCE(l.value, 0) AS love_value, COALESCE(v.value, 0) AS vote_value FROM posts p
        LEFT JOIN loves l ON l.post_id = p.post_id AND l.user_id = $2
        LEFT JOIN votes v ON v.post_id = p.post_id AND v.user_id = $2
        JOIN users u ON u.user_id = p.user_id
        WHERE LOWER(u.anonymous_name) = LOWER($1) AND ($3::int IS NULL OR p.post_category = $3::int)
        AND u.deleted = FALSE
    `;
    const ORDER_LIMIT = `ORDER BY created_at DESC LIMIT 5`;


    try {
        let result;

        if(!lastCreatedAt) {
            result = await pool.query(`${BASE_SELECT} ${ORDER_LIMIT}`, [anonymous_name, user_id, ...(postCategory === "all" ? [null]:[POST_CATEGORIES.indexOf(postCategory)] )]);
        } else {
            result = await pool.query(`${BASE_SELECT} AND p.created_at < $4 ${ORDER_LIMIT}`, [anonymous_name, user_id, ...(postCategory === "all" ? [null]:[POST_CATEGORIES.indexOf(postCategory)] ), lastCreatedAt]);
        };
        
        return res.status(200).json({ok: true, body: result.rows});
    } catch (err) {
        console.log(err);
        return res.status(400).json({ok: false, msg: "Something went wrong. Try again!"});
    };
};


module.exports = GetPostsViewer;