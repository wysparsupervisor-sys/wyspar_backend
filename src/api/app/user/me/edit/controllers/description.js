const { body, validationResult } = require("express-validator");
const pool = require("../../../../../../config/pg");

const ProcessDescriptionEdit = async (req, res) => {
    try {
        const user_id = req.user.ID;
        const description = req.body.description;

        await body("description").exists().notEmpty().isString().isLength({max:  150, min: 1}).withMessage("Invalid description!").run(req);
        //handle validation result
        const errors = validationResult(req);
        if(!errors.isEmpty()) return res.status(400).json({ok: false, msg: errors.array({ onlyFirstError: true })[0].msg});

        await pool.query(`UPDATE users SET details = jsonb_set(details, '{description}', to_jsonb($1::text), true) WHERE user_id = $2`, [description, user_id]);

        res.status(200).json({ok: true, msg: "success"});
    } catch (err) {
        console.log(err);
        res.status(400).json({ok: false, msg: "Something went wrong. Try again!"});
    };     
};



module.exports = ProcessDescriptionEdit;