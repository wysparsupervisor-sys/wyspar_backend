const { body, validationResult } = require("express-validator");
const AVATAR_STYLES = require("../../../../../../lib/data/avatar-styles");
const pool = require("../../../../../../config/pg");



const ProcessAvatarEdit = async (req, res) => {
    try {
        const user_id = req.user.ID;

        //validate all request inputs
        await body("seed").exists().notEmpty().isString().isLength({max: 20}).withMessage("Try regenerating your avatar").run(req);
        await body("style").exists().notEmpty().isString().isIn(AVATAR_STYLES).withMessage("Try regenerating your avatar").run(req);

        const new_avatar = { seed: req.body.seed, style: req.body.style };

        //handle validation result
        const errors = validationResult(req);
        if(!errors.isEmpty()) return res.status(400).json({ok: false, msg: errors.array({ onlyFirstError: true })[0].msg});
        
        //everything goes well? then proceed to main app logic
        await pool.query(`UPDATE users SET details = jsonb_set(details, '{avatar}', $1::jsonb, true) WHERE user_id = $2`, [new_avatar, user_id]);

        res.status(200).json({ok:true, msg: "success"});

    } catch (err) {
        console.log(err);
        res.status(400).json({ok: false, msg: "Something went wrong. Try again!"});
    }
};



module.exports = ProcessAvatarEdit;