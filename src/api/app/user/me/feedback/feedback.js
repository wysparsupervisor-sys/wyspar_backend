const { body, validationResult } = require("express-validator");
const pool = require("../../../../../config/pg");

const ProcessFeedBack = async (req,res) => {
    await body("feedback").exists().notEmpty().isString().trim().isLength({max: 300, min: 30}).run(req);
    //handle validation result
    const errors = validationResult(req);
    if(!errors.isEmpty()) return res.status(400).json({ok: false});

    const { feedback } = req.body;
    console.log(feedback);
    const user_id = req.user.ID;

    try {
        await pool.query(`INSERT INTO feedbacks (user_id, feedback) VALUES ($1, $2)`, [user_id, feedback]);
        return res.status(200).json({ok: true});
    } catch (err) {
        console.log(err);
        return res.status(400).json({ok: false, msg: "Something went wrong. Try again!"});
    };
};


module.exports = ProcessFeedBack;