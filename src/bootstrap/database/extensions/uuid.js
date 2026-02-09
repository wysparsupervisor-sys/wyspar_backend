const pool = require("../../../config/pg");

const AddUUIDOSSPExtension = async () => {
    const query = `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;

    try {
        await pool.query(query);
        console.log("Added uuid-ossp extension successfully!");
    } catch (err) {
        console.log(err);
    };
};


module.exports = AddUUIDOSSPExtension;