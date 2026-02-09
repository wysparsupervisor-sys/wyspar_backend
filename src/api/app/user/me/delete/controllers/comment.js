const { body, validationResult } = require("express-validator");
const pool = require("../../../../../../config/pg");

const ProcessCommentDelete = async (req, res) => {
    await body("comment_id").exists().isString().isUUID().run(req);
    //handle validation result
    const errors = validationResult(req);
    if(!errors.isEmpty()) return res.status(400).json({ok: false, msg: "Invalid request body"});

    const { comment_id } = req.body;
    const user_id = req.user.ID;

    const query = `
        WITH delete_comment AS (
            DELETE FROM comments WHERE comment_id = $1 AND user_id = $2 RETURNING post_id
        )
        UPDATE posts SET total_comment = total_comment - 1 WHERE post_id IN (SELECT post_id FROM delete_comment);
    `;

    try {
        await pool.query(query, [comment_id, user_id]);
        return res.status(200).json({ok: true});
    } catch (err) {
        console.log(err);
        return res.status(400).json({ok: false, msg: "Something went wrong. Try again!"});
    };
};


module.exports = ProcessCommentDelete;