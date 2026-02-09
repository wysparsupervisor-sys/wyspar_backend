const pool = require("../../../config/pg");

const CreateCommentsTable = async () => {
    const creation_query = `
        CREATE TABLE IF NOT EXISTS comments (
            comment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            post_id UUID NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
            comment TEXT NOT NULL, 
            is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    `;

    const post_id_index = `CREATE INDEX IF NOT EXISTS idx_comments_post_time ON comments(post_id, created_at DESC) WHERE is_hidden = FALSE`;
    const user_id_index = `CREATE INDEX IF NOT EXISTS idx_comments_user_time ON comments(user_id, created_at DESC) WHERE is_hidden = FALSE`;
    const client = await pool.connect();

    try {
        await client.query("BEGIN");
        await client.query(creation_query);
        await client.query(post_id_index);
        await client.query(user_id_index);
        await client.query("COMMIT");

        console.log("Comments DB table created successfully ✉📩");
    } catch (err) {
        await client.query("ROLLBACK");
        return console.log(err);
    } finally {
        client.release();
    };
};



module.exports = CreateCommentsTable;