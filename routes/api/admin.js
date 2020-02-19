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

module.exports = adminRoute;

// select * from `financialyear` where center_id = '1' and  CURDATE() between str_to_date(startdate, '%d-%m-%Y') and str_to_date(enddate, '%d-%m-%Y')
// select * from `financialyear` where center_id = '1' and  str_to_date('01-05-2019','%d-%m-%Y') between str_to_date(startdate, '%d-%m-%Y') and str_to_date(enddate, '%d-%m-%Y')

// INSERT INTO `backorder` (`id`, `enquiry_detail_id`, `qty`, `reason`, `status`)
// VALUES
// 	(1, 38, 4, 'No Stock', 'O');
