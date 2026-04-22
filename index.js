const pool = require("./src/config/pg");

async function ADDPersona (){
    try {
        const users = (await pool.query("SELECT user_id FROM users")).rows;
    for (const user of users){
        await pool.query(`INSERT INTO personalities (user_id) VALUES ($1)`, [user.user_id])
    }
    console.log("done")
    } catch (error) {
        console.log(err);
    }
};

ADDPersona() 