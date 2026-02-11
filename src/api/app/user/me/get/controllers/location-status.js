const { query, validationResult } = require("express-validator");
const GetLocationClass = require("../../../../../../lib/utils/location-status");


const GetUserLocationStatus = async (req, res) => {
    try {
        //verify payload
        await query("lat").exists().withMessage("").run(req);
        await query("long").exists().withMessage("").run(req);
        await query("accuracy").exists().withMessage("").run(req);

        //handle validation result
        const errors = validationResult(req);
        if(!errors.isEmpty()) return res.status(400).json({ok: false, location_status: "unreliable"});
                
        //begin main logic
        const { lat, long, accuracy } = req.query;
        const { school } = req.user;
        
        const location_class = GetLocationClass(parseFloat(lat), parseFloat(long), parseFloat(accuracy), school);
        return res.status(200).json({ok: true, location_status: location_class});
    } catch (err) {
        console.log(err);
        return res.status(400).json({ok: false, msg: "Something went wrong. Try again!", location_status: "unreliable"});
    }
};


module.exports = GetUserLocationStatus;