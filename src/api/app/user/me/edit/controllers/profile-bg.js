const { body, validationResult } = require("express-validator");
const pool = require("../../../../../../config/pg");
const { PROFILE_BACKGROUND_ANIMATIONS } = require("../../../../../../lib/data/profile-bg-animations");

const ProcessProfileBgEdit = async (req, res) => {
    try {
        const user_id = req.user.ID;
        const bg = req.body.bg;

        await body("bg").exists().notEmpty().isString().isIn(PROFILE_BACKGROUND_ANIMATIONS).withMessage("Invalid input!").run(req);
        //handle validation result
        const errors = validationResult(req);
        if(!errors.isEmpty()) return res.status(400).json({ok: false, msg: errors.array({ onlyFirstError: true })[0].msg});

        await pool.query(`UPDATE users SET details = jsonb_set(details, '{profile_background}', to_jsonb($1::text), true) WHERE user_id = $2`, [bg, user_id]);
        res.status(200).json({ok: true, msg: "success"});
    } catch (err) {
        console.log(err);
        res.status(400).json({ok: false, msg: "Something went wrong. Try again!"});
    };     
};



module.exports = ProcessProfileBgEdit;