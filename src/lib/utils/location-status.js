const SCHOOL_COORDS = require("../data/school-coords");
const haversine = require("haversine-distance");


function GetLocationClass(user_lat, user_long, user_accuracy, user_school){
    const coords = SCHOOL_COORDS[user_school];

    //get school lats, long, and accuracy
    const school_lat = coords.lat;
    const school_long = coords.long;
    const school_tolerable_accuracy = coords.tolerable_accuracy;
    const on_campus_limit = coords.range_classification.on_campus_limit;
    const near_campus_limit = coords.range_classification.near_campus_limit;

    if(user_accuracy  > school_tolerable_accuracy) return "unreliable";
    const radial_distance = haversine({lat: user_lat, lon: user_long}, { lat: school_lat, lon: school_long });

    if(radial_distance <= on_campus_limit) return "on-campus";
    if((radial_distance <= near_campus_limit) && (radial_distance > on_campus_limit)) return "near-campus";
    if(radial_distance > near_campus_limit) return "off-campus";
};


module.exports = GetLocationClass;