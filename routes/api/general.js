const express = require("express");
const router = express.Router();

const mysql = require("mysql");
const moment = require("moment");

const connection = mysql.createConnection({
	host: "localhost",
	user: "root",
	password: "filia",
	database: "reddotdb"
});

//mgt
router.get("/search-product/:centerid/:searchstr", (req, res) => {
	let searchstr = req.params.searchstr;
	let centerid = req.params.centerid;

	let sql = `select a.product_code as product_code, a.description, a.mrp, a.taxrate, b.available_stock,
	a.packetsize, a.unit_price, a.id
  from 
  product a, 
  stock b
  where 
  a.id = b.product_id and
  a.center_id = '${centerid}' and
  ( a.product_code like '%${searchstr}%' or
  a.description like '%${searchstr}%' ) limit 50 
 `;

	console.log("query > " + sql);

	connection.query(sql, function(err, data) {
		if (err) {
			console.log("object error " + err);
		} else {
			res.json(data);
		}
	});
});

//mgt
router.get("/inventory/all", (req, res) => {
	let sql = `select p.product_code, p.description, p.mrp, s.available_stock
  from product p, 
       stock s 
  where p.product_code= s.product_code`;

	connection.query(sql, function(err, data) {
		if (err) {
			console.log("object error " + err);
		} else {
			res.json(data);
		}
	});
});

//mgt
router.get("/all-clients", (req, res) => {
	// let sql = `select * from party_master where status = 'A'`;

	let sql = `select * from customer where isactive = 'A'`;

	connection.query(sql, function(err, data) {
		if (err) {
			console.log("object error " + err);
		} else {
			res.json(data);
		}
	});
});

//mgt
router.get("/all-active-vendors/:centerid", (req, res) => {
	let centerid = req.params.centerid;
	// let sql = `select * from vendor where isactive = 'A' and center_id = ${centerid}`;

	let sql = `select v.id, v.center_id, v.name, v.address1, v.address2, v.district, s.code, s.description,
	v.pin, v.gst, v.phone, v.mobile, v.mobile2, v.whatsapp, v.discount, v.email, v.isactive, v.billingstatus  from 
	vendor v,
	state s
	where 
	v.state_id = s.id and isactive = 'A' and center_id = ${centerid}`;

	connection.query(sql, function(err, data) {
		if (err) {
			console.log("sql exec failed.... " + err);
		} else {
			res.json(data);
		}
	});
});

router.get("/add-enquiry-master/:customerid", (req, res) => {
	//	let partycode = req.params.partycode;
	//	console.log(" inside apply jobs CODE ..." + customerid);

	var today = new Date();
	today = moment(today).format("YYYY-MM-DD HH:mm:ss");
	let query = `INSERT INTO enquiry ( customer_id, enquiry_date) values ( '${customerid}','${today}')`;

	let yourJsonObj = req.body;

	connection.query(query, function(err, data) {
		if (err) {
			console.log("object..." + err);
			res.status(500).json({
				result: "NOTOK",
				message: `ERROR While updating.`
			});
		} else {
			let tmpid = data.insertId;
			console.log("object inside else ..." + tmpid);

			res.json({
				result: "OK",
				enquiryid: tmpid
			});
		}
	});
});

router.post("/add-parts-details-enquiry", (req, res) => {
	console.log(" inside apply jobs ...");
	let yourJsonObj = req.body;

	var objectKeysArray = Object.keys(yourJsonObj);
	objectKeysArray.forEach(function(objKey) {
		console.log("object..KEY..." + JSON.stringify(objKey));
		var objValue = yourJsonObj[objKey];
		console.log("object..VAL." + JSON.stringify(objValue));

		var today = new Date();
		today = moment(today).format("YYYY-MM-DD HH:mm:ss");
		let query = `INSERT INTO enquiry_detail ( enquiry_id, item_code, qty) values ( '${objValue.enquiryid}','${objValue.partno}','${objValue.quantity}')`;

		connection.query(query, function(err, data) {
			if (err) {
				console.log("object..." + err);
			}
		});
	});
});

router.post("/insert-purchase-details", (req, res) => {
	console.log(" inside apply jobs ...");
	let yourJsonObj = req.body;

	//console.log("lets print >" + JSON.stringify(yourJsonObj));

	const vendorValue = yourJsonObj["vendor"];
	const invoiceno = yourJsonObj["invoiceno"];

	let invoicedate = yourJsonObj["invoicedate"];
	if (yourJsonObj["invoicedate"] !== "") {
		invoicedate = moment(yourJsonObj["invoicedate"]).format("YYYY-MM-DD");
	}

	let order_date = yourJsonObj["orderdate"];

	if (yourJsonObj["orderdate"] !== "") {
		order_date = moment(yourJsonObj["orderdate"]).format("YYYY-MM-DD");
	}

	let lr_date = yourJsonObj["lrdate"];
	if (yourJsonObj["lrdate"] !== "") {
		lr_date = moment(yourJsonObj["lrdate"]).format("YYYY-MM-DD");
	}

	const no_of_boxes = yourJsonObj["noofboxes"];
	// const received_date = yourJsonObj["orderrcvddt"];
	const received_date = moment(yourJsonObj["orderrcvddt"]).format("YYYY-MM-DD");

	const lr_no = yourJsonObj["lrno"];
	const order_no = yourJsonObj["orderno"];

	const no_of_items = yourJsonObj["noofitems"];
	const total_qty = yourJsonObj["totalqty"];
	const taxable_value = yourJsonObj["taxable_value"];
	const total_value = yourJsonObj["totalvalue"];
	const product_arr = yourJsonObj["productarr"];
	const transport_charges = yourJsonObj["transport_charges"];
	const unloading_charges = yourJsonObj["unloading_charges"];
	const misc_charges = yourJsonObj["misc_charges"];
	const net_total = yourJsonObj["net_total"];

	const igst = yourJsonObj["igst"];
	const cgst = yourJsonObj["cgst"];
	const sgst = yourJsonObj["sgst"];

	// console.log("vendorValue " + vendorValue);
	// console.log("invoiceno " + invoiceno);
	// console.log("invoicedate " + invoicedate);

	product_arr.forEach(function(k) {
		//	console.log("what >> " + k.product_code);
	});

	// console.log("does it work " + seqnce);

	var month = moment().format("M");
	var day = moment().format("D");
	var year = moment().format("YYYY");

	let billingno = "P" + seqnce++ + year + month + day;

	//console.log("object pring now " + billingno);

	let query = `
	INSERT INTO purchase ( bill_no, center_id, vendor_id, invoice_no, invoice_date, 
		lr_no, lr_date, received_date, purchase_type, order_no, 
		order_date, total_qty, no_of_items, taxable_value, cgst, sgst, igst, 
		total_value, transport_charges, unloading_charges, misc_charges, net_total, no_of_boxes)
		VALUES
			( '${billingno}', 1, '${vendorValue.id}', '${invoiceno}', '${invoicedate}', '${lr_no}', '${lr_date}', 
			'${received_date}', 
			'GST Inovoice',
			'${order_no}', 
			'${order_date}', 
			'${total_qty}', 
			'${no_of_items}', 
			'${taxable_value}', 
			'${cgst}', 
			'${sgst}', 
			'${igst}', 
			'${total_value}', 
			'${transport_charges}', 
			'${unloading_charges}', 
			'${misc_charges}', 
			'${net_total}', 
			'${no_of_boxes}'
			)`;

	connection.query(query, function(err, data) {
		if (err) {
			console.log("object..." + err);
		} else {
			console.log("object..DATA." + JSON.stringify(data));
			let newPK = data.insertId;

			product_arr.forEach(function(k) {
				console.log("what >> " + k.product_code);

				let query1 = `

				INSERT INTO purchase_detail(purchase_id, product_id, qty, unit_price, mrp, batchdate, tax,
					igst, cgst, sgst, taxable_value, total_value)
				VALUES
					( '${newPK}', '${k.product_id}', '${k.qty}', 1382.12, '2346', '2020-01-16', 18, 497.56, 0.00, 0.00, 2764.24, 3261.80)
				
					`;

				connection.query(query1, function(err, data) {
					if (err) {
						console.log("object..." + err);
					} else {
						console.log("object... success");
						let query2 = `
						update stock set available_stock =  available_stock + 1
where product_id = '${k.product_id}' `;

						connection.query(query2, function(err, data) {
							if (err) {
								console.log("object..." + err);
							} else {
								console.log("object..stock update .");
							}
						});
					}
				});
			});
		}
	});
	// 	});
});

router.get("/all-active-enquiries", (req, res) => {
	let sql = `select em.id id, em.enquiry_date, pm.name 
  from 
  enquiry em, 
  party pm 
  where 
  em.partycode = pm.partycode and
  estatus = 'A'
  order by
  enquiry_date desc`;

	connection.query(sql, function(err, data) {
		if (err) {
			console.log("object error " + err);
		} else {
			res.json(data);
		}
	});
});

module.exports = router;

router.get("/get-enquiry/:enquiryid", (req, res) => {
	console.log("object error......... ");
	let enquiryid = req.params.enquiryid;

	let sql = `select * 
  from 
  enquiry_detail ed,
  enquiry em, 
  parts p
  where
  ed.partno = p.partno and
  em.id = ed.enquiry_id and
  ed.enquiry_id = ${enquiryid}
  `;

	connection.query(sql, function(err, data) {
		if (err) {
			console.log("object error " + err);
		} else {
			res.json(data);
		}
	});
});

router.get("/get-party-details/:enquiryid", (req, res) => {
	let enquiryid = req.params.enquiryid;

	console.log("object error......... " + enquiryid);

	let sql = `     select pm.*
  from 
  enquiry em, 
party pm
where
em.partycode = pm.partycode and
em.id = ${enquiryid}`;

	connection.query(sql, function(err, data) {
		if (err) {
			console.log("object error " + err);
		} else {
			res.json(data);
		}
	});
});
