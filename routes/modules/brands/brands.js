var pool = require("../../helpers/db");
const moment = require("moment");

const insertBrand = (insertValues, callback) => {
	var today = new Date();
	today = moment(today).format("YYYY-MM-DD HH:mm:ss");

	let query = `  INSERT INTO brand (center_id, name, createdon, isactive ) VALUES (?, ?, '${today}', 'A')`;

	let values = [insertValues.center_id, insertValues.name];

	pool.query(query, values, function (err, data) {
		if (err) return callback(err);
		return callback(null, data);
	});
};

const updateBrand = (updateValues, id, callback) => {
	var today = new Date();
	today = moment(today).format("YYYY-MM-DD HH:mm:ss");

	let query = ` 	update brand set center_id = '${updateValues.center_id}',
	name = '${updateValues.name}' where 
	id = '${id}'
	`;

	pool.query(query, function (err, data) {
		if (err) return callback(err);
		return callback(null, data);
	});
};

const getAllBrands = (center_id, status, callback) => {
	let query = `select * from brand b
	          where 
	          b.center_id = '${center_id}' and isactive = '${status}' order by b.name`;

	pool.query(query, function (err, data) {
		if (err) return callback(err);
		return callback(null, data);
	});
};

const getBrandsMissingDiscountsByCustomer = (center_id, status, customer_id, callback) => {
	let query = `select b.id, b.name from brand b where b.id not in 
						(select distinct d.brand_id 
						from 
						discount d
						where 
						b.center_id = '${center_id}' and isactive = '${status}' and
						d.customer_id = '${customer_id}'
						) order by b.name`;

	pool.query(query, function (err, data) {
		if (err) return callback(err);
		return callback(null, data);
	});
};

module.exports = {
	insertBrand,
	updateBrand,
	getAllBrands,
	getBrandsMissingDiscountsByCustomer,
};
