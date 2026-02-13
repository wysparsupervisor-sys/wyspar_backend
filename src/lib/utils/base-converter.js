const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
function UUIDToBase62(uuid=""){
    let num =  BigInt('0x' + uuid.replace(/-/g, ''));
    let out = '';
    while (num > 0n) {
        out = BASE62[num % 62n] + out;
        num /= 62n;
    };
    return out;
};


function Base62ToUUID(base62){
    let num = 0n;

    for (const char of base62){
        const index = BigInt(BASE62.indexOf(char));
        if (index === -1n) throw new Error("Invalid base62 char");
        num = num * 62n + index;
    };

    let hex = num.toString(16).padStart(32, '0');

    return (
        hex.slice(0,8) + '-' +
        hex.slice(8,12) + '-' +
        hex.slice(12,16) + '-' +
        hex.slice(16,20) + '-' +
        hex.slice(20)
    );
};


module.exports = { UUIDToBase62, Base62ToUUID };