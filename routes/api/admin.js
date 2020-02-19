const express = require("express");
const adminRoute = express.Router();

const mysql = require("mysql");
const moment = require("moment");

const connection = mysql.createConnection({
	host: "localhost",
	user: "root",
	password: "filia",
	database: "reddotdb"
});

adminRoute.get("/view-products-count/:centerid", (req, res) => {
	let center_id = req.params.centerid;

	let sql = `select count(*) as count from product p where 
	p.center_id = '${center_id}' `;

	connection.query(sql, function(err, data) {
		if (err) {
			console.log("object error " + err);
		} else {
			res.json(data);
		}
	});
});

adminRoute.get("/view-product-info/:centerid/:product_id", (req, res) => {
	let center_id = req.params.centerid;
	let product_id = req.params.product_id;

	let sql = `select p.*, v.name as vendor_name, v.id as vendar_id  
	from 
	product p,
	vendor v 
	where
	p.vendor_id = v.id and
	p.id = '${product_id}' and
	p.center_id = '${center_id}' `;

	console.log("object view-product-info " + sql);

	connection.query(sql, function(err, data) {
		if (err) {
			console.log("object error " + err);
		} else {
			res.json(data);
		}
	});
});

adminRoute.post("/add-product", (req, res) => {
	let jsonObj = req.body;

	console.log(" inside add purchase ..." + JSON.stringify(jsonObj));

	var objValue = jsonObj["formArray"];

	const basic_info = objValue[0];
	const general_info = objValue[1];
	const addl_info = objValue[2];
	console.log("object>>" + basic_info);

	const center_id = basic_info["center_id"];
	const vendor_id = basic_info["vendorid"];

	const product_code = basic_info["product_code"];
	const description = basic_info["description"];

	const unit = general_info["unit"];

	const packetsize = general_info["packetsize"];
	const hsncode = general_info["hsncode"];
	const taxrate = general_info["taxrate"];

	const minqty = general_info["minqty"];

	const currentstock = addl_info["currentstock"];
	const unit_price = addl_info["unit_price"];
	const mrp = addl_info["mrp"];
	const purchaseprice = addl_info["purchaseprice"];
	const salesprice = addl_info["salesprice"];
	const rackno = addl_info["rackno"];
	const location = addl_info["location"];
	const maxdiscount = addl_info["maxdiscount"];
	const alternatecode = addl_info["alternatecode"];

	const itemdiscount = addl_info["itemdiscount"];
	const reorderqty = addl_info["reorderqty"];
	const avgpurprice = addl_info["avgpurprice"];
	const avgsaleprice = addl_info["avgsaleprice"];
	const margin = addl_info["margin"];

	var today = new Date();
	today = moment(today).format("YYYY-MM-DD HH:mm:ss");

	let query = `INSERT INTO 
		product 
			(center_id, vendor_id, product_code, description, unit, packetsize, hsncode, currentstock, unit_price, mrp, 
				purchaseprice, salesprice, rackno, location, maxdiscount, alternatecode, taxrate, 
				minqty, itemdiscount, reorderqty, avgpurprice, avgsaleprice, margin)
		VALUES
			( '${center_id}', '${vendor_id}', '${product_code}', '${description}', '${unit}', 
			'${packetsize}', '${hsncode}', '${currentstock}', '${unit_price}', '${mrp}',
			 '${purchaseprice}', '${salesprice}', '${rackno}', '${location}', '${maxdiscount}', '${alternatecode}', '${taxrate}', 
			 '${minqty}', '${itemdiscount}', '${reorderqty}', '${avgpurprice}', '${avgsaleprice}', '${margin}');
			`;

	connection.query(query, function(err, data) {
		if (err) {
			console.log("object..." + err);
		} else {
			let newPK = data.insertId;
			console.log("object..newPK." + newPK);
		}
	});
});

adminRoute.post("/update-product", (req, res) => {
	let jsonObj = req.body;

	console.log(" inside add purchase ..." + JSON.stringify(jsonObj));

	var objValue = jsonObj["formArray"];

	const basic_info = objValue[0];
	const general_info = objValue[1];
	const addl_info = objValue[2];
	console.log("object>>" + basic_info);

	const product_id = basic_info["product_id"];
	const center_id = basic_info["center_id"];
	const vendor_id = basic_info["vendorid"];

	const product_code = basic_info["product_code"];
	const description = basic_info["description"];

	const unit = general_info["unit"];

	const packetsize = general_info["packetsize"];
	const hsncode = general_info["hsncode"];
	const taxrate = general_info["taxrate"];

	const minqty = general_info["minqty"];

	const currentstock = addl_info["currentstock"];
	const unit_price = addl_info["unit_price"];
	const mrp = addl_info["mrp"];
	const purchaseprice = addl_info["purchaseprice"];
	const salesprice = addl_info["salesprice"];
	const rackno = addl_info["rackno"];
	const location = addl_info["location"];
	const maxdiscount = addl_info["maxdiscount"];
	const alternatecode = addl_info["alternatecode"];

	const itemdiscount = addl_info["itemdiscount"];
	const reorderqty = addl_info["reorderqty"];
	const avgpurprice = addl_info["avgpurprice"];
	const avgsaleprice = addl_info["avgsaleprice"];
	const margin = addl_info["margin"];

	let query = `
	update product set center_id = '${center_id}', vendor_id = '${vendor_id}',
product_code = '${product_code}', description = '${description}',unit = '${unit}',
packetsize = '${packetsize}', hsncode = '${hsncode}',currentstock = '${currentstock}',
unit_price = '${unit_price}', mrp = '${mrp}',purchaseprice = '${purchaseprice}',
salesprice = '${salesprice}', rackno = '${rackno}',location = '${location}',
	maxdiscount = '${maxdiscount}', alternatecode = '${alternatecode}',taxrate = '${taxrate}',
		minqty = '${minqty}', itemdiscount = '${itemdiscount}',reorderqty = '${reorderqty}',
			avgpurprice = '${avgpurprice}', avgsaleprice = '${avgsaleprice}',margin = '${margin}'
			where
id = '${product_id}'
	`;

	connection.query(query, function(err, data) {
		if (err) {
			console.log("object..." + err);
			res.status(500).json({
				result: "NOTOK",
				message: `ERROR While updating.`
			});
		} else {
			res.json({
				result: "success"
			});
		}
	});
});

// vendor
adminRoute.get("/get-vendor-details/:centerid/:vendorid", (req, res) => {
	let center_id = req.params.centerid;
	let vendor_id = req.params.vendorid;
	console.log("inside get vendor details");
	let sql = `select * from vendor v where 
	v.id = '${vendor_id}' and
	v.center_id = '${center_id}' `;

	connection.query(sql, function(err, data) {
		if (err) {
			console.log("object error " + err);
		} else {
			res.json(data);
		}
	});
});

// vendor
adminRoute.get("/get-states", (req, res) => {
	console.log("inside get vendor details");
	let sql = `select * from state `;

	connection.query(sql, function(err, data) {
		if (err) {
			console.log("object error " + err);
		} else {
			res.json(data);
		}
	});
});

// vendor

adminRoute.post("/update-vendor", (req, res) => {
	let jsonObj = req.body;

	console.log(" inside add purchase ..." + JSON.stringify(jsonObj));

	var objValue = jsonObj["formArray"];

	const basic_info = objValue[0];
	const general_info = objValue[1];
	const addl_info = objValue[2];
	console.log("object>>" + basic_info);

	const center_id = basic_info["center_id"];
	const vendor_id = basic_info["vendor_id"];

	const name = basic_info["name"];

	const address1 = basic_info["address1"];
	const address2 = basic_info["address2"];
	const address3 = basic_info["address3"];
	const district = basic_info["district"];

	const state_id = basic_info["state_id"];
	const pin = basic_info["pin"];

	const gst = general_info["gst"];
	const phone = general_info["phone"];
	const mobile = general_info["mobile"];
	const mobile2 = general_info["mobile2"];
	const whatsapp = general_info["whatsapp"];

	const email = addl_info["email"];

	let query = `
	update vendor set center_id = '${center_id}',
	name = '${name}', address1 = '${address1}',address2 = '${address2}', address3 = '${address3}',
	district = '${district}', state_id = '${state_id}', pin = '${pin}',gst = '${gst}',
	phone = '${phone}', mobile = '${mobile}',mobile2 = '${mobile2}', whatsapp = '${whatsapp}',
	email = '${email}'
	where
	id = '${vendor_id}'
	`;

	connection.query(query, function(err, data) {
		if (err) {
			console.log("object..." + err);
			res.status(500).json({
				result: "NOTOK",
				message: `ERROR While updating.`
			});
		} else {
			res.json({
				result: "success"
			});
		}
	});
});

// vendor
adminRoute.post("/add-vendor", (req, res) => {
	let jsonObj = req.body;

	console.log(" inside add purchase ..." + JSON.stringify(jsonObj));

	var objValue = jsonObj["formArray"];

	const basic_info = objValue[0];
	const general_info = objValue[1];
	const addl_info = objValue[2];
	console.log("object>>" + basic_info);

	const center_id = basic_info["center_id"];

	const name = basic_info["name"];

	const address1 = basic_info["address1"];
	const address2 = basic_info["address2"];
	const address3 = basic_info["address3"];
	const district = basic_info["district"];

	const state_id = basic_info["state_id"];
	const pin = basic_info["pin"];

	const gst = general_info["gst"];
	const phone = general_info["phone"];
	const mobile = general_info["mobile"];
	const mobile2 = general_info["mobile2"];
	const whatsapp = general_info["whatsapp"];

	const email = addl_info["email"];

	var today = new Date();
	today = moment(today).format("YYYY-MM-DD HH:mm:ss");

	let query = `
		INSERT INTO vendor (center_id, name, address1, address2, address3, district, state_id, pin, 
		gst, phone, mobile, mobile2, whatsapp, email, createdon, isactive)
		VALUES
			('${center_id}', '${name}', '${address1}', '${address2}', '${address3}', '${district}', '${state_id}', '${pin}',
			'${gst}', '${phone}', '${mobile}', '${mobile2}', '${whatsapp}', '${email}', '${today}', 'A'
			) `;

	console.log("query >>>> " + query);

	connection.query(query, function(err, data) {
		if (err) {
			console.log("object..." + err);
			res.status(500).json({
				result: "NOTOK",
				message: `ERROR While updating.`
			});
		} else {
			res.json({
				result: "success"
			});
		}
	});
});

// Customers
adminRoute.get("/get-customer-details/:centerid/:customerid", (req, res) => {
	let center_id = req.params.centerid;
	let customer_id = req.params.customerid;
	console.log("inside get vendor details");
	let sql = `select * from customer c where 
	c.id = '${customer_id}' and
	c.center_id = '${center_id}' `;

	connection.query(sql, function(err, data) {
		if (err) {
			console.log("object error " + err);
		} else {
			res.json(data);
		}
	});
});

// customers

adminRoute.post("/update-customer", (req, res) => {
	let jsonObj = req.body;

	console.log(" inside add purchase ..." + JSON.stringify(jsonObj));

	var objValue = jsonObj["formArray"];

	const basic_info = objValue[0];
	const general_info = objValue[1];
	const addl_info = objValue[2];
	console.log("object>>" + basic_info);

	const center_id = basic_info["center_id"];
	const customer_id = basic_info["customer_id"];

	const name = basic_info["name"];

	const address1 = basic_info["address1"];
	const address2 = basic_info["address2"];
	const address3 = basic_info["address3"];
	const district = basic_info["district"];

	const state_id = basic_info["state_id"];
	const pin = basic_info["pin"];

	const gst = general_info["gst"];
	const phone = general_info["phone"];
	const mobile = general_info["mobile"];
	const mobile2 = general_info["mobile2"];
	const whatsapp = general_info["whatsapp"];

	const email = addl_info["email"];

	let query = `
	update customer set center_id = '${center_id}',
	name = '${name}', address1 = '${address1}',address2 = '${address2}', address3 = '${address3}',
	district = '${district}', state_id = '${state_id}', pin = '${pin}',gst = '${gst}',
	phone = '${phone}', mobile = '${mobile}',mobile2 = '${mobile2}', whatsapp = '${whatsapp}',
	email = '${email}'
	where
	id = '${customer_id}'
	`;

	console.log("print the val " + query);

	connection.query(query, function(err, data) {
		if (err) {
			console.log("object..." + err);
			res.status(500).json({
				result: "NOTOK",
				message: `ERROR While updating.`
			});
		} else {
			res.json({
				result: "success"
			});
		}
	});
});

adminRoute.post("/add-customer", (req, res) => {
	let jsonObj = req.body;

	console.log(" inside add purchase ..." + JSON.stringify(jsonObj));

	var objValue = jsonObj["formArray"];

	const basic_info = objValue[0];
	const general_info = objValue[1];
	const addl_info = objValue[2];
	console.log("object>>" + basic_info);

	const center_id = basic_info["center_id"];

	const name = basic_info["name"];

	const address1 = basic_info["address1"];
	const address2 = basic_info["address2"];
	const address3 = basic_info["address3"];
	const district = basic_info["district"];

	const state_id = basic_info["state_id"];
	const pin = basic_info["pin"];

	const gst = general_info["gst"];
	const phone = general_info["phone"];
	const mobile = general_info["mobile"];
	const mobile2 = general_info["mobile2"];
	const whatsapp = general_info["whatsapp"];

	const email = addl_info["email"];

	var today = new Date();
	today = moment(today).format("YYYY-MM-DD HH:mm:ss");

	let query = `
		INSERT INTO customer (center_id, name, address1, address2, address3, district, state_id, pin, 
		gst, phone, mobile, mobile2, whatsapp, email, createdon, isactive)
		VALUES
			('${center_id}', '${name}', '${address1}', '${address2}', '${address3}', '${district}', '${state_id}', '${pin}',
			'${gst}', '${phone}', '${mobile}', '${mobile2}', '${whatsapp}', '${email}', '${today}', 'A'
			) `;

	console.log("query >>>> " + query);

	connection.query(query, function(err, data) {
		if (err) {
			console.log("object..." + err);
			res.status(500).json({
				result: "NOTOK",
				message: `ERROR While updating.`
			});
		} else {
			res.json({
				result: "success"
			});
		}
	});
});

// Customers
adminRoute.get("/get-center-details/:centerid", (req, res) => {
	let center_id = req.params.centerid;

	console.log("inside get vendor details");
	let sql = `select * from center c where 
	c.id = '${center_id}'  `;

	connection.query(sql, function(err, data) {
		if (err) {
			console.log("object error " + err);
		} else {
			res.json(data);
		}
	});
});

adminRoute.post("/update-center", (req, res) => {
	let jsonObj = req.body;

	console.log(" inside add purchase ..." + JSON.stringify(jsonObj));

	var objValue = jsonObj["formArray"];

	const basic_info = objValue[0];
	const general_info = objValue[1];
	const addl_info = objValue[2];
	console.log("object>>" + basic_info);

	const center_id = basic_info["center_id"];
	const company_id = basic_info["company_id"];

	const name = basic_info["name"];

	const address1 = basic_info["address1"];
	const address2 = basic_info["address2"];
	const address3 = basic_info["address3"];
	const district = basic_info["district"];

	const state_id = basic_info["state_id"];
	const pin = basic_info["pin"];

	const gst = general_info["gst"];
	const phone = general_info["phone"];
	const mobile = general_info["mobile"];
	const mobile2 = general_info["mobile2"];
	const whatsapp = general_info["whatsapp"];

	const email = addl_info["email"];

	const bankname = addl_info["bankname"];
	const accountno = addl_info["accountno"];
	const ifsccode = addl_info["ifsccode"];
	const branch = addl_info["branch"];

	let query = `
	update center set company_id = '${company_id}',
	name = '${name}', address1 = '${address1}',address2 = '${address2}', address3 = '${address3}',
	district = '${district}', state_id = '${state_id}', pin = '${pin}',gst = '${gst}',
	phone = '${phone}', mobile = '${mobile}',mobile2 = '${mobile2}', whatsapp = '${whatsapp}',
	email = '${email}', bankname = '${bankname}', accountno = '${accountno}', ifsccode = '${ifsccode}', branch = '${branch}'
	where
	id = '${center_id}'
	`;

	console.log("print the val " + query);

	connection.query(query, function(err, data) {
		if (err) {
			console.log("object..." + err);
			res.status(500).json({
				result: "NOTOK",
				message: `ERROR While updating.`
			});
		} else {
			res.json({
				result: "success"
			});
		}
	});
});

module.exports = adminRoute;

// select * from `financialyear` where center_id = '1' and  CURDATE() between str_to_date(startdate, '%d-%m-%Y') and str_to_date(enddate, '%d-%m-%Y')
// select * from `financialyear` where center_id = '1' and  str_to_date('01-05-2019','%d-%m-%Y') between str_to_date(startdate, '%d-%m-%Y') and str_to_date(enddate, '%d-%m-%Y')
