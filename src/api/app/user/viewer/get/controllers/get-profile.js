const { param, validationResult } = require("express-validator");
const pool = require("../../../../../../config/pg");


const GetProfileViewer = async (req, res) => {
    await param("anonymous_name").exists().isString().isLength({min: 3, max: 15}).withMessage("").run(req);

    //handle validation result
    const errors = validationResult(req);
    if(!errors.isEmpty()) return res.status(400).json({ok: false, msg: errors.array({ onlyFirstError: true })[0].msg});
    
    const { anonymous_name } = req.params;
    const query = `
        SELECT 
        CASE WHEN user_id = $2 THEN jsonb_build_object('isMe', true)
        ELSE jsonb_build_object('anonymous_name', anonymous_name, 'gender', gender, 'school', school, 'details', details, 'stats', stats)
        END AS RESULT
        FROM users WHERE LOWER(anonymous_name) = LOWER($1)
        AND deleted = FALSE
    `;

    //pg returns differently when using jdonb_build_object
    const confused = await pool.query(query, [anonymous_name, req.user.ID]);
    if(confused.rows.length === 0) return res.status(404).json({ok: true, exists: false});
    const { result } = confused.rows[0];

    res.status(200).json({ok: true, exists: true, body: result});
};


module.exports = GetProfileViewer;