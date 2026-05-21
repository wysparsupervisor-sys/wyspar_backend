const { query, validationResult } = require("express-validator");
const pool = require("../../../../../config/pg");

const GetPostComments = async (req, res) => {
    const is_subscribed = req.subscription.is_subscribed;
    if(!is_subscribed) return res.status(200).json({ok: true, cause:"nosub"});

    await query("post_id").exists().isString().isUUID().withMessage("").run(req);
    await query("lastCreatedAt").optional().isISO8601().withMessage("").run(req);

    //handle validation result
    const errors = validationResult(req);
    if(!errors.isEmpty()) return res.status(400).json({ok: false, msg: errors.array({ onlyFirstError: true })[0].msg});
    
    const { lastCreatedAt } = req.query;
    const BASE_SELECT = `
        SELECT c.comment, c.created_at, c.comment_id, u.anonymous_name, u.school, u.details->'avatar' AS avatar, u.details->'profile_photo' AS profile_photo FROM comments c 
        JOIN users u ON u.user_id = c.user_id
        WHERE c.post_id = $1
        AND u.deleted = FALSE
    `;
    const ORDER = `
        ORDER BY created_at DESC LIMIT 10
    `;

    try {
        let result;

        if (!lastCreatedAt) {
            result = await pool.query(`${BASE_SELECT} ${ORDER}`, [req.query.post_id]);
        } else {
            result = await pool.query(`${BASE_SELECT} AND c.created_at < $2 ${ORDER}`, [req.query.post_id, lastCreatedAt])
        };

        return res.status(200).json({ok: true, body: result.rows});
    } catch (err) {
        console.log(err);
        return res.status(400).json({ok: false, msg: "Something went wrong. Try again!"});
    };
};


module.exports = GetPostComments;