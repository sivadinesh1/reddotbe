var pool = require("../../helpers/db");
const moment = require("moment");
const logger = require("./../../helpers/log4js");

const insertEnquiryDetail = (k, jsonObj, tmpid, callback) => {
	var today = new Date();
	today = moment(today).format("YYYY-MM-DD HH:mm:ss");

	// let query = `  INSERT INTO brand (center_id, name, createdon, isactive ) VALUES (?, ?, '${today}', 'A')`;

	logger.debug.debug(" CHECK ORDER OR ARRAY LOOPING ...xx..." + k.notes);
	let query = `INSERT INTO enquiry_detail ( enquiry_id, product_id, askqty, product_code, notes, status)
        values ( '${tmpid}', (select id from product where product_code='${k.product_code}' and center_id = '${jsonObj.center_id}'), '${k.quantity}', '${k.product_code}', '${k.notes}', 'O')`;

	return new Promise(function (resolve, reject) {
		pool.query(query, function (err, data) {
			if (err) {
				logger.debug.debug("insert enquiry callback " + JSON.stringify(err));
				return reject(callback(err));
			}
			return resolve(callback(null, data));
		});
	});
};

module.exports = {
	insertEnquiryDetail,
};
