require("dotenv").config();
const { Pool } = require("pg");
const fs = require("fs");
const isProduction = process.env.NODE_ENV === "production";

//set up databse config
const pool = new Pool({
    connectionString: isProduction ? process.env.POSTGRES_CONNECTION_STRING : "postgres://postgres:imustgotoharvard11@localhost:5432/wispr" ,
    ...(
        isProduction && {
            ssl: {
                rejectUnauthorized: true,
                ca: fs.readFileSync("/home/ubuntu/certs/pg_ca.pem").toString(),
            }
        }
    )
});


module.exports = pool;