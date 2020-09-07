var pool = require("../../helpers/db");
const moment = require("moment");

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
					brand_id: 0,
				};

				insertCustomerDiscount(formObj, (err, rows) => {
					if (err) return handleError(new ErrorHandler("500", "Error fetching sales master"), res);
				});
			});

			let query1 = `
	INSERT INTO customer_shipping_address (customer_id, address1, address2, address3, district, state_id, pin, def_address)
	VALUES (?, ?, ?, ?, ?, ?, ?, 'Y' ) `;
			let values1 = [
				data.insertId,

				insertValues.address1,
				insertValues.address2,
				insertValues.address3,
				insertValues.district,
				insertValues.state_id,
				insertValues.pin,
			];

			pool.query(query1, values1, function (err, data) {
				if (err) {
					return callback(err);
				} else {
					// do nothing
				}
			});

			return callback(null, { id: data.insertId });
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

// fetch rows for default (brandid as zero) customer discounts from discount tbl
const getAllCustomerDefaultDiscounts = (centerid, callback) => {
	let query = ` 
	SELECT 
	c.name, 'default' as 'brand_name',   d.type, d.brand_id as brand_id, 
     sum(if( d.gst_slab = 0, d.value, 0 ) ) AS gstzero,  
     sum(if( d.gst_slab = 5, d.value, 0 ) ) AS gstfive, 
     sum(if( d.gst_slab = 12, d.value, 0 ) ) AS gsttwelve, 
     sum(if( d.gst_slab = 18, d.value, 0 ) ) AS gsteighteen, 
		 sum(if( d.gst_slab = 28, d.value, 0 ) ) AS gsttwentyeight,
		 c.id as id, d.startdate  
FROM 
	customer c,
    discount d
    where 
    d.brand_id = 0 and
		d.center_id = ? and
    c.id = d.customer_id
    
    group by 
    c.name, d.type, d.brand_id, c.id, d.startdate   
    order by
    c.name
	`;

	let values = [centerid];

	pool.query(query, values, function (err, data) {
		if (err) return callback(err);
		return callback(null, data);
	});
};

// fetch rows for default (brandid as zero) customer discounts from discount tbl
const getDiscountsByCustomer = (centerid, customerid, callback) => {
	let query = ` 
	SELECT 
	c.name,  '' as 'brand_name',  d.type, d.brand_id as brand_id, 
     sum(if( d.gst_slab = 0, d.value, 0 ) ) AS gstzero,  
     sum(if( d.gst_slab = 5, d.value, 0 ) ) AS gstfive, 
     sum(if( d.gst_slab = 12, d.value, 0 ) ) AS gsttwelve, 
     sum(if( d.gst_slab = 18, d.value, 0 ) ) AS gsteighteen, 
		 sum(if( d.gst_slab = 28, d.value, 0 ) ) AS gsttwentyeight,
		 c.id as id, d.startdate  
FROM 
	customer c,
    discount d
    where 
    d.brand_id = 0 and
		d.center_id = ? and
		c.id = ? and
		d.customer_id = ?
    group by 
    c.name, d.type, d.brand_id,c.id, d.startdate      
    order by
    c.name
	`;
	console.log("latest > " + query);
	let values = [centerid, customerid, customerid, customerid];

	pool.query(query, values, function (err, data) {
		if (err) return callback(err);
		return callback(null, data);
	});
};

// fetch rows for default (brandid as NON zero) customer discounts from discount tbl
const getDiscountsByCustomerByBrand = (centerid, customerid, callback) => {
	let query = ` 
	SELECT 
	c.name,  b.name as 'brand_name',  d.type, d.brand_id as brand_id, 
     sum(if( d.gst_slab = 0, d.value, 0 ) ) AS gstzero,  
     sum(if( d.gst_slab = 5, d.value, 0 ) ) AS gstfive, 
     sum(if( d.gst_slab = 12, d.value, 0 ) ) AS gsttwelve, 
     sum(if( d.gst_slab = 18, d.value, 0 ) ) AS gsteighteen, 
		 sum(if( d.gst_slab = 28, d.value, 0 ) ) AS gsttwentyeight,
		 c.id as id, d.startdate  
FROM 
	customer c,
    discount d,
    brand b
    where 
    d.brand_id <> 0 and
		d.brand_id = b.id and
		d.center_id = ? and
		c.id = ? and
		d.customer_id = ?
    
    group by 
    c.name, d.type, d.brand_id, b.name, c.id, d.startdate      
    order by
    c.name, b.name

	`;

	console.log("object" + query);

	console.log("cener id object" + centerid);
	console.log(" customerid object" + customerid);

	let values = [centerid, customerid, customerid];

	pool.query(query, values, function (err, data) {
		if (err) return callback(err);
		return callback(null, data);
	});
};

// fetch rows for default (brandid as NON zero) customer discounts from discount tbl
const getDiscountsByAllCustomerByBrand = (centerid, callback) => {
	let query = ` 
	SELECT 
	c.name,  b.name as 'brand_name',  d.type, d.brand_id as brand_id, 
     sum(if( d.gst_slab = 0, d.value, 0 ) ) AS gstzero,  
     sum(if( d.gst_slab = 5, d.value, 0 ) ) AS gstfive, 
     sum(if( d.gst_slab = 12, d.value, 0 ) ) AS gsttwelve, 
     sum(if( d.gst_slab = 18, d.value, 0 ) ) AS gsteighteen, 
		 sum(if( d.gst_slab = 28, d.value, 0 ) ) AS gsttwentyeight,
		 c.id as id, d.startdate  
FROM 
	customer c,
    discount d,
    brand b
    where 
    d.brand_id != 0 and
		d.brand_id = b.id and
		d.center_id = ? 
    
    group by 
    c.name, d.type, d.brand_id, b.name, c.id, d.startdate      
    order by
    c.name, b.name

	`;

	let values = [centerid];

	pool.query(query, values, function (err, data) {
		if (err) return callback(err);
		return callback(null, data);
	});
};

// insert row in discount tbl
const insertCustomerDiscount = (insertValues, callback) => {
	let query = ` INSERT INTO discount (center_id, customer_id, type, value, gst_slab, startdate, enddate, brand_id)
  VALUES ( ?, ?, ?, ?, ?, ?, ?, ?) `;

	let values = [
		insertValues.center_id,
		insertValues.customer_id,
		insertValues.type,
		insertValues.value,
		insertValues.gst_slab,
		insertValues.startdate,
		insertValues.enddate,
		insertValues.brand_id,
	];

	pool.query(query, values, function (err, data) {
		if (err) return callback(err);
		return callback(null, data);
	});
};

// update rows in discount tbl // check
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

// update rows in discount tbl // check
const updateDefaultCustomerDiscount = (updateValues, callback) => {
	let query = ` 
	UPDATE discount
	SET value = (case when gst_slab = 0 then '${updateValues.gstzero}'
	when gst_slab = 5 then '${updateValues.gstfive}'
	when gst_slab = 12 then '${updateValues.gsttwelve}'
	when gst_slab = 18 then '${updateValues.gsteighteen}'
	when gst_slab = 28 then '${updateValues.gsttwentyeight}'

									end),
									startdate = '${moment(updateValues.effDiscStDate).format("DD-MM-YYYY")}',
			type= '${updateValues.disctype}'
	WHERE 
	brand_id = '${updateValues.brand_id}' and
	center_id = '${updateValues.center_id}' and
	customer_id = '${updateValues.customer_id}'
	`;
	console.log("object >>>>> " + query);
	pool.query(query, function (err, data) {
		if (err) return callback(err);
	});

	return callback(null, 1);
};

// fetch rows from customer tbl & customer shipping addres tbl
const getCustomerDetails = (centerid, customerid) => {
	let query = `select c.*, s.code,
	csa.state_id as csa_state,
	csa.address1 as csa_address1,
	csa.address2 as csa_address2, 
	csa.address3 as csa_address3,
	csa.district as csa_district,
	csa.pin as csa_pin,
	csa.def_address as def_address,
	s1.code as csa_code
	from 
	customer c,
	state s,
	state s1,
	customer_shipping_address csa  
	where 
	s1.id = csa.state_id and
	s.id = c.state_id and
	csa.customer_id = c.id and
	csa.def_address= 'Y' and
	
	c.id = '${customerid}' and
	c.center_id = '${centerid}' `;

	console.log("get-customer-details > " + query);

	let values = [centerid, customerid];

	// pool.query(query, values, function (err, data) {
	// 	if (err) return callback(err);
	// 	return callback(null, data);
	// });

	return new Promise(function (resolve, reject) {
		pool.query(query, function (err, data) {
			if (err) {
				reject(err);
			}
			resolve(data);
		});
	});
};

// fetch rows from customer tbl & customer shipping addres tbl
const getSearchCustomers = (centerid, searchstr, callback) => {
	let query = `
	select c.id, c.center_id, c.name, c.address1, c.address2, c.district, s.code, s.description,
	c.pin, c.gst, c.phone, c.mobile, c.mobile2, c.whatsapp,  c.email, c.isactive,
		csa.state_id as csa_state,
csa.address1 as csa_address1,
csa.address2 as csa_address2, 
csa.address3 as csa_address3,
csa.district as csa_district,
csa.pin as csa_pin,
csa.def_address as def_address,
s1.code as csa_code
	from 
	customer c,
	state s,
	state s1,
	customer_shipping_address csa  
	where 
	s1.id = csa.state_id and
	csa.customer_id = c.id and
	csa.def_address = 'Y' and
	c.state_id = s.id and isactive = 'A' and center_id = '${centerid}' and ( c.name like '%${searchstr}%') limit 50 `;

	console.log("get-customer-details > " + query);

	let values = [centerid, searchstr];

	pool.query(query, values, function (err, data) {
		if (err) return callback(err);
		return callback(null, data);
	});
};

// insert row in customer tbl
const insertDiscountsByBrands = (insertValues, callback) => {
	var today = new Date();
	today = moment(today).format("YYYY-MM-DD HH:mm:ss");

	let taxSlabArr = [
		{ gstslab: 0, gstvalue: insertValues.gstzero },
		{ gstslab: 5, gstvalue: insertValues.gstfive },
		{ gstslab: 12, gstvalue: insertValues.gsttwelve },
		{ gstslab: 18, gstvalue: insertValues.gsteighteen },
		{ gstslab: 28, gstvalue: insertValues.gsttwentyeight },
	];

	console.log("dinesh KL " + taxSlabArr);

	taxSlabArr.forEach((e) => {
		let formObj = {
			center_id: insertValues.center_id,
			customer_id: insertValues.customer_id,
			brand_id: insertValues.brand_id,
			type: insertValues.disctype,
			value: e.gstvalue,
			gst_slab: e.gstslab,
			startdate: moment(today).format("DD-MM-YYYY"),
			enddate: "01-04-9999",
		};

		console.log("object..." + JSON.stringify(formObj));

		insertCustomerDiscount(formObj, (err, rows) => {
			if (err) return handleError(new ErrorHandler("500", "Error fetching sales master"), res);
		});
	});
	return callback(null, "1");
};

// SHIPPING ADDRESS
// fetch rows from customer shipping address tbl
const getCustomerShippingAddress = (customerid, callback) => {
	let query = ` select csa.*, s.description as state_name
from 
customer_shipping_address csa,
state s 
where 
csa.state_id = s.id and
customer_id = ? order by id desc `;

	let values = [customerid];

	pool.query(query, values, function (err, data) {
		if (err) return callback(err);
		return callback(null, data);
	});
};

const insertCustomerShippingAddress = (insertValues, callback) => {
	console.log("dinesh " + JSON.stringify(insertValues));

	let def_address = insertValues.def_address === true ? "Y" : "N";

	if (def_address === "Y") {
		let sql = `update customer_shipping_address set def_address = 'N' where customer_id = '${insertValues.customer_id}' `;

		pool.query(sql, function (err, data1) {
			if (err) return callback(err);
		});
	}

	let query1 = `
	INSERT INTO customer_shipping_address (customer_id, address1, address2, address3, district, state_id, pin, def_address)
	VALUES (?, ?, ?, ?, ?, ?, ?, ? ) `;
	let values1 = [
		insertValues.customer_id,

		insertValues.address1,
		insertValues.address2,
		insertValues.address3,
		insertValues.district,
		insertValues.state_id,
		insertValues.pin,
		def_address,
	];

	console.log("dinesh insertCustomerShippingAddress " + JSON.stringify(values1));

	pool.query(query1, values1, function (err, data) {
		if (err) {
			return callback(err);
		} else {
			return callback(null, { id: data.insertId });
		}
	});
};

const updateCustomerShippingAddress = (updateValues, id, callback) => {
	console.log("object >> " + JSON.stringify(updateValues));
	console.log("object >> " + id);
	var today = new Date();
	today = moment(today).format("YYYY-MM-DD HH:mm:ss");

	if (updateValues.def_address) {
		let sql = `update customer_shipping_address set def_address = 'N' where customer_id = '${updateValues.customer_id}' `;

		pool.query(sql, function (err, data1) {
			if (err) return callback(err);
			let query = `
			update customer_shipping_address set
			address1 = '${updateValues.address1}',address2 = '${updateValues.address2}',
			district = '${updateValues.district}', state_id = '${updateValues.state_id}', pin = '${updateValues.pin}', def_address = '${
				updateValues.def_address === true ? "Y" : "N"
			}'
			where
			id = '${id}'
			`;
			console.log("object.." + query);

			pool.query(query, function (err, data) {
				if (err) return callback(err);
				return callback(null, data);
			});
		});
	} else {
		let query = `
		update customer_shipping_address set
		address1 = '${updateValues.address1}',address2 = '${updateValues.address2}',
		district = '${updateValues.district}', state_id = '${updateValues.state_id}', pin = '${updateValues.pin}', def_address = '${
			updateValues.def_address === true ? "Y" : "N"
		}'
		where
		id = '${id}'
		`;
		console.log("object.." + query);

		pool.query(query, function (err, data) {
			if (err) return callback(err);
			return callback(null, data);
		});
	}
};

module.exports = {
	getCustomerDiscount,
	insertCustomerDiscount,
	updateCustomerDiscount,
	insertCustomer,
	updateCustomer,
	getSearchCustomers,
	getCustomerDetails,
	getAllCustomerDefaultDiscounts,
	getDiscountsByCustomer,
	getDiscountsByCustomerByBrand,
	getDiscountsByAllCustomerByBrand,
	updateDefaultCustomerDiscount,
	insertDiscountsByBrands,

	updateCustomerShippingAddress,
	insertCustomerShippingAddress,
	getCustomerShippingAddress,
};
