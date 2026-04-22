const { body, validationResult } = require("express-validator");
const pool = require("../../../../../../config/pg");

const ProcessConnectDelete = async (req, res) => {
    await body("connect_id").exists().isString().isUUID().run(req);
    //handle validation result
    const errors = validationResult(req);
    if(!errors.isEmpty()) return res.status(400).json({ok: false, msg: "Invalid request body"});

    const { connect_id } = req.body;
    const user_id = req.user.ID;

    const query = `
        DELETE FROM connects WHERE connect_id = $1 AND user_id = $2
    `;

    try {
        await pool.query(query, [connect_id, user_id]);
        return res.status(200).json({ok: true});
    } catch (err) {
        console.log(err);
        return res.status(400).json({ok: false, msg: "Something went wrong. Try again!"});
    };
};


module.exports = ProcessConnectDelete;