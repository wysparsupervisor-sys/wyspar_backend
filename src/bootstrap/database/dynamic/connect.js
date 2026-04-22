const pool = require("../../../config/pg");

const CreateConnectTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS connects (
            user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
            connect_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            purpose TEXT NOT NULL,
            phone TEXT NOT NULL,
            location TEXT,
            extra TEXT,
            embedding VECTOR(384) NOT NULL,
            normalized_interest_sparse_vector VECTOR(50) NOT NULL,
            main_interest_index INT NOT NULL,
            is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    `; 

    const query2 = `
        CREATE INDEX IF NOT EXISTS idx_connect_embedding_vector ON connects USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100) WHERE is_hidden = FALSE
    `;
    const query3  = `
        CREATE INDEX IF NOT EXISTS idx_connects_user_id ON connects(user_id, created_at DESC) WHERE is_hidden = FALSE;
    `;
    const query4  = `
        CREATE INDEX IF NOT EXISTS idx_connects_connect_id ON connects(connect_id) WHERE is_hidden = FALSE;
    `;
    const query5  = `
        CREATE INDEX IF NOT EXISTS idx_connects_location ON connects USING GIN (location gin_trgm_ops) WHERE is_hidden = FALSE;
    `;
    const query6  = `
        CREATE INDEX IF NOT EXISTS idx_connects_created_at ON connects (created_at) WHERE is_hidden = FALSE;
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
    } catch (err) {
        await client.query("ROLLBACK");
        console.log(err);
    } finally {
        client.release();
        console.log("Connect table configured successfully");
    };
};


module.exports = CreateConnectTable