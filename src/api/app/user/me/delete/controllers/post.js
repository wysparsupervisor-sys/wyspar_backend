const { body, validationResult } = require("express-validator");
const pool = require("../../../../../../config/pg");
const S3 = require("../../../../../../config/s3");
const { DeleteObjectCommand } = require("@aws-sdk/client-s3");

const ProcessPostDelete = async (req, res) => {
    await body("post_id").exists().isString().isUUID().run(req);
    //handle validation result
    const errors = validationResult(req);
    if(!errors.isEmpty()) return res.status(400).json({ok: false, msg: "Invalid request body"});
            
    
    const { post_id } = req.body;
    const user_id = req.user.ID;
    const query = `
        WITH delete_post AS (
            DELETE FROM posts WHERE post_id = $1 AND user_id = $2 RETURNING total_view, total_upvote, total_love, images
        ),
        update_counter AS (
            UPDATE users u
            SET stats = jsonb_set(
                jsonb_set(
                    jsonb_set(
                        jsonb_set(
                            u.stats,
                            '{posts}',
                            to_jsonb((u.stats->>'posts')::int - 1)
                        ),
                        '{upvotes}',
                        to_jsonb((u.stats->>'upvotes')::int - d.total_upvote)
                    ),
                    '{views}',
                    to_jsonb((u.stats->>'views')::int - d.total_view)
                ),
                '{likes}',
                to_jsonb((u.stats->>'likes')::int - d.total_love)
            )
            FROM delete_post d WHERE u.user_id = $2
        )
        SELECT images FROM delete_post;
    `;


    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const result = await client.query(query, [post_id, user_id]);
        if(!result.rows.length) throw new Error(`User ${user_id} tried to delete an already deleted row in posts table`);
        //check if images then  delete FROM S3
        
        const images = result.rows[0].images;
        if(images && images.length > 0) {
            await S3.send(new DeleteObjectCommand({
                Bucket: "media",
                Key: images[0], 
            }));
        };
        await client.query("COMMIT");
        return res.status(200).json({ok: true});

    } catch (err) {
        await client.query("ROLLBACK"); 
        console.log(err);
        return res.status(400).json({ok: false, msg: "Something went wrong. Try again!"});
    } finally {
        client.release();
    };
};


module.exports = ProcessPostDelete; 