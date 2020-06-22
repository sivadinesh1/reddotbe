var pool = require("../../helpers/db");
const moment = require("moment");

// fetch rows from discount tbl
const getCustomerDiscount = (centerid, customerid, callback) => {
	let query = ` select * from discount where center_id = ? and customer_id = ? `;
	let values = [centerid, customerid];

	pool.query(query, values, function (err, data) {
		if (err) return callback(err);
		return callback(null, data);
	});
};

// insert row in discount tbl
const insertCustomerDiscount = (insertValues, callback) => {
	let query = ` INSERT INTO discount (center_id, customer_id, type, value, gst_slab, startdate, enddate)
  VALUES ( ?, ?, ?, ?, ?, ?, ?) `;

	let values = [
		insertValues.center_id,
		insertValues.customer_id,
		insertValues.type,
		insertValues.value,
		insertValues.gst_slab,
		insertValues.startdate,
		insertValues.enddate,
	];

	pool.query(query, values, function (err, data) {
		if (err) return callback(err);
		return callback(null, data);
	});
};

// update rows in discount tbl
const updateCustomerDiscount = (updateValues, callback) => {
	updateValues.forEach((element) => {
		let stdate = moment(element.startdate).format("DD-MM-YYYY");

		let query = ` update discount set type = '${element.type}', value = '${element.value}', 
                  gst_slab = '${element.gst_slab}', startdate = '${stdate}', enddate = '${element.enddate}' 
                  where id = '${element.id}' `;

		pool.query(query, function (err, data) {
			if (err) return callback(err);
		});
	});

	return callback(null, 1);
};

module.exports = {
	getCustomerDiscount,
	insertCustomerDiscount,
	updateCustomerDiscount,
};
