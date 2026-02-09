const { query, validationResult } = require("express-validator");
const pool = require("../../../../config/pg");


const ProcessWysparerSearch = async (req, res) => {
    await query("search_query").exists().isString().isLength({min: 3, max: 15}).run(req);
    await query("lastItemRankProp").optional().isFloat().run(req);
    //handle validation result
    const errors = validationResult(req);
    if(!errors.isEmpty()) return res.status(400).json({ok: false, msg: "Invalid query object"});

    const { search_query } = req.query;
    const last_dist_score = req.query.lastItemRankProp || null;
    
    const db_query = `
        SELECT anonymous_name, stats->'posts' AS posts, school, details->'avatar' AS avatar, gender, anonymous_name <-> $1 AS dist_score FROM users
        WHERE (anonymous_name % $1 OR anonymous_name ILIKE '%' || $1 || '%')
            AND school = $2
            AND ($3::float IS NULL OR anonymous_name <-> $1 > ($3::float + 1e-7))
            AND deleted = FALSE
        ORDER BY dist_score ASC
        LIMIT 15;
    `;
 
    try {
        const result = await pool.query(db_query, [search_query, req.user.school, last_dist_score]);
        return res.status(200).json({ok: true, body: result.rows});
    } catch (err) {
        console.log(err);
        return res.status(400).json({ok: false, msg: "Something went wrong. Try again!"});
    };
};


module.exports = ProcessWysparerSearch;