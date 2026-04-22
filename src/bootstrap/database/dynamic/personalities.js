const pool = require("../../../config/pg");

const CreatePersonalitiesTable = async () => {
    const vector_size = 50;
    let initial_net_frequency = 0;
    const rand_vector = (() => {
        const v = Array.from({ length: vector_size}, () => 0);
        return `${v.join(",")}`
    })();
        
    const query = `
        CREATE TABLE IF NOT EXISTS personalities (
            user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
            connect_personality VECTOR(${vector_size}) NOT NULL DEFAULT '[${rand_vector}]',
            net_connect_frequency DOUBLE PRECISION NOT NULL DEFAULT ${initial_net_frequency},
            connect_description TEXT
        );
    `; 
  
    const query2 = ` 
        CREATE INDEX IF NOT EXISTS idx_connect_personality_vector ON personalities USING ivfflat (connect_personality vector_cosine_ops) WITH (lists = 100)
    `;
    const query4  = `
        CREATE INDEX IF NOT EXISTS idx_personalities_user_id ON personalities(user_id);
    `;

    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await client.query(query);
        await client.query(query2);
        await client.query(query4);
        await client.query("COMMIT");
    } catch (err) {
        await client.query("ROLLBACK");
        console.log(err);
    } finally {
        client.release();
        console.log("Personalities table configured successfully");
    };
};


module.exports = CreatePersonalitiesTable;