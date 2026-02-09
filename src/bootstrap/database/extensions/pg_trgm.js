const pool = require("../../../config/pg");

const AddPgTrgmExtension = async () => {
    const query = `CREATE EXTENSION IF NOT EXISTS pg_trgm`;

    try {
        await pool.query(query);
        console.log("Added pg_trgm extension successfully!");
    } catch (err) {
        console.log(err);
    };
};


module.exports = AddPgTrgmExtension;