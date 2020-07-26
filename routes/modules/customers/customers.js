var pool = require("../../helpers/db");
const moment = require("moment");

// const center_id = basic_info["center_id"];

// const name = basic_info["name"];

// const address1 = basic_info["address1"];
// const address2 = basic_info["address2"];
// const address3 = basic_info["address3"];
// const district = basic_info["district"];

// const state_id = basic_info["state_id"];
// const pin = basic_info["pin"];

// const gst = general_info["gst"];
// const phone = general_info["phone"];
// const mobile = general_info["mobile"];
// const mobile2 = general_info["mobile2"];
// const whatsapp = general_info["whatsapp"];
// const email = general_info["email"];

// const disctype = addl_info["disctype"];
// const gstzero = addl_info["gstzero"];
// const gstfive = addl_info["gstfive"];
// const gsttwelve = addl_info["gsttwelve"];
// const gsteighteen = addl_info["gsteighteen"];
// const gsttwentyeight = addl_info["gsttwentyeight"];

// insert row in customer tbl
const insertCustomer = (insertValues, callback) => {
	var today = new Date();
	today = moment(today).format("YYYY-MM-DD HH:mm:ss");

	let taxSlabArr = [
		{ gstslab: 0, gstvalue: insertValues.gstzero },
		{ gstslab: 5, gstvalue: insertValues.gstfive },
		{ gstslab: 12, gstvalue: insertValues.gsttwelve },
		{ gstslab: 18, gstvalue: insertValues.gsteighteen },
		{ gstslab: 28, gstvalue: insertValues.gsttwentyeight },
	];

	let query = `
		INSERT INTO customer (center_id, name, address1, address2, address3, district, state_id, pin, 
		gst, phone, mobile, mobile2, whatsapp, email, createdon, isactive)
		VALUES
			(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '${today}', 'A' ) `;

	let values = [
		insertValues.center_id,
		insertValues.name,
		insertValues.address1,
		insertValues.address2,
		insertValues.address3,
		insertValues.district,
		insertValues.state_id,
		insertValues.pin,
		insertValues.gst,
		insertValues.phone,
		insertValues.mobile,
		insertValues.mobile2,
		insertValues.whatsapp,
		insertValues.email,
	];

	pool.query(query, values, function (err, data) {
		if (err) {
			return callback(err);
		} else {
			taxSlabArr.forEach((e) => {
				let formObj = {
					center_id: insertValues.center_id,
					customer_id: data.insertId,
					type: insertValues.disctype,
					value: e.gstvalue,
					gst_slab: e.gstslab,
					startdate: moment(today).format("DD-MM-YYYY"),
					enddate: "01-04-9999",
				};

				insertCustomerDiscount(formObj, (err, rows) => {
					if (err) return handleError(new ErrorHandler("500", "Error fetching sales master"), res);
				});
			});
			return callback(null, { id: data.insertId, custdata: values });
		}
	});
};

const updateCustomer = (updateValues, id, callback) => {
	console.log("object >> " + JSON.stringify(updateValues));
	console.log("object >> " + id);
	var today = new Date();
	today = moment(today).format("YYYY-MM-DD HH:mm:ss");

	let query = `
	update customer set center_id = '${updateValues.center_id}',
	name = '${updateValues.name}', address1 = '${updateValues.address1}',address2 = '${updateValues.address2}', address3 = '${updateValues.address3}',
	district = '${updateValues.district}', state_id = '${updateValues.state_id}', pin = '${updateValues.pin}',gst = '${updateValues.gst}',
	phone = '${updateValues.phone}', mobile = '${updateValues.mobile}',mobile2 = '${updateValues.mobile2}', whatsapp = '${updateValues.whatsapp}',
	email = '${updateValues.email}'
	where
	id = '${id}'
	`;
	console.log("object.." + query);

	pool.query(query, function (err, data) {
		if (err) return callback(err);
		return callback(null, data);
	});
};

// fetch rows from discount tbl
const getCustomerDiscount = (centerid, customerid, callback) => {
	let query = ` select d.id as id, d.customer_id as customer_id, d.center_id as center_id, d.type, d.value, d.gst_slab, d.startdate, d.enddate,
	c.name as customer_name
	 from 
	discount d,
	customer c
	where 
	c.id = d.customer_id and
	d.center_id = ? and d.customer_id =  ? `;

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
	insertCustomer,
	updateCustomer,
};
