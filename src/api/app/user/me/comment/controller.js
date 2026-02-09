const { body, validationResult, query } = require("express-validator");
const pool = require("../../../../../config/pg");

const ProcessComment = async (req, res) => {
    const is_subscribed = req.subscription.is_subscribed;
    if (!is_subscribed) return res.status(200).json({ok: false});

    //validate comment
    await body("comment").exists().isString().isLength({min: 2, max: 500}).withMessage("Invalid request body").run(req);
    await body("post_id").exists().isString().isUUID().withMessage("Invalid request body").run(req);
    await query("withProfileData").exists().isIn(["true","false"]).withMessage("Invalid request paramseter").run(req);

    //handle validation result
    const errors = validationResult(req);
    if(!errors.isEmpty()) return res.status(400).json({ok: false, msg: errors.array({ onlyFirstError: true })[0].msg});

    const { comment, post_id } = req.body;
    const { withProfileData } = req.query;
    const user_id = req.user.ID;

    //add comment and icrement post comment counter
    let query_db;
    const qWithoutProfileData =  `
        WITH inserted_comment AS (
            INSERT INTO comments (comment, post_id, user_id) VALUES ($1, $2, $3) RETURNING created_at, comment_id
        ),
        update_post_counter AS (
            UPDATE posts SET total_comment = total_comment + 1 WHERE post_id = $2
        )
        SELECT created_at, comment_id FROM inserted_comment;
    `;
    const qWithProfileData =  `
        WITH inserted_comment AS (
            INSERT INTO comments (comment, post_id, user_id) VALUES ($1, $2, $3) RETURNING created_at, user_id, comment_id
        ),
        update_post_counter AS (
            UPDATE posts SET total_comment = total_comment + 1 WHERE post_id = $2
        )
        SELECT u.school, u.anonymous_name, u.details, i.created_at, i.comment_id FROM users u 
        LEFT JOIN inserted_comment i ON u.user_id = i.user_id
        WHERE u.user_id = $3;
    `;

    query_db = withProfileData === "true" ? qWithProfileData : qWithoutProfileData;

    try {
        const result = await pool.query(query_db, [comment, post_id, user_id]);
        return res.status(200).json({ok: true, msg: "success", body: result.rows[0]});
    } catch (err) {
        console.log(err);
        return res.status(400).json({ok: false, msg: "Something went wrong. Try again!"});
    };
};


module.exports = ProcessComment;