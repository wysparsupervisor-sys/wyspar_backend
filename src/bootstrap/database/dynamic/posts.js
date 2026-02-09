const pool = require("../../../config/pg");

const CreatePostsTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS posts (
            post_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
            content TEXT NOT NULL,
            content_tsv TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
            post_type INT NOT NULL,
            post_category INT NOT NULL,
            post_style INT,
            embedding VECTOR(384),
            images TEXT[],
            location_status INT NOT NULL,
            total_upvote INT DEFAULT 0,
            total_downvote INT DEFAULT 0,
            total_love INT DEFAULT 0,
            total_view INT DEFAULT 0,
            total_comment INT DEFAULT 0,
            is_hidden BOOLEAN DEFAULT FALSE,
            metadata JSONB,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    `;

    const query2 = `
        CREATE INDEX IF NOT EXISTS embedding_vector_idx ON posts USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100) WHERE is_hidden = FALSE
    `;
    const query3 = `
        CREATE INDEX IF NOT EXISTS idx_posts_tsv ON posts USING GIN (content_tsv) WHERE is_hidden = FALSE;
    `;
    const query4 = `
        CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id) WHERE is_hidden = FALSE;
    `;
    const query5 = `
        CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(post_category) WHERE is_hidden = FALSE;
    `;
    const query6 = `
        CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at) WHERE is_hidden = FALSE;
    `;

    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await client.query(query);
        await client.query(query2);
        await client.query(query3);
        await client.query(query4);
        await client.query(query5);
        await client.query(query6);
        await client.query("COMMIT");

        console.log("Posts DB configured successfully 📪🥳");
    } catch (err) {
        client.query("ROLLBACK");
        console.log(err)
    } finally {
        client.release();
    }
};


module.exports = CreatePostsTable;