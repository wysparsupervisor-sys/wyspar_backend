const pool = require("../../../config/pg");

const CreateCentroidsTable = async () => {
    const vector_size = 384;
    const rand_vector = (() => {
        const v = Array.from({ length: vector_size}, () => Math.random() * 2 - 1);
        const norm = Math.sqrt(v.reduce((sum, x) => sum + x * x, 0));
        return `${v.map(x => x / norm).join(",")}`
    })();

    const client = await pool.connect();
    const creation_query = `
        CREATE TABLE IF NOT EXISTS centroids (
            centroid_id INT PRIMARY KEY,
            centroid_vector VECTOR(${vector_size}) NOT NULL DEFAULT '[${rand_vector}]'
        );
    `;

    try {
        await client.query("BEGIN");
        await client.query(creation_query);
        //insert 300 centroids into DB
        for (let i = 0; i < 50; i++) {
            await client.query(`INSERT INTO centroids (centroid_id) VALUES ($1) ON CONFLICT DO NOTHING`, [i]);
        };
        await client.query("COMMIT");
    } catch (err) {
        await client.query("ROLLBACK");
        console.log(err);
    } finally {
        client.release();
        console.log("Centroids table configured successfully");
    };
};


module.exports = CreateCentroidsTable;