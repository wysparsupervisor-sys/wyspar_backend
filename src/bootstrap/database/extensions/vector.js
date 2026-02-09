const pool = require("../../../config/pg");

const AddVectorExtension = async () => {
    const query = `CREATE EXTENSION IF NOT EXISTS vector`;

    try {
        await pool.query(query);
        console.log("Added vector extension successfully!");
    } catch (err) {
        console.log(err);
    };
};


module.exports = AddVectorExtension;