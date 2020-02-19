const express = require("express");
const router = express.Router();

const mysql = require("mysql");
const moment = require("moment");

const { createInvoice } = require("./createInvoice.js");

const connection = mysql.createConnection({
	host: "localhost",
	user: "root",
	password: "filia",
	database: "reddotdb"
});

const invoice = {
	shipping: {
		name: "John Doe",
		address: "1234 Main Street",
		city: "San Francisco",
		state: "CA",
		country: "US",
		postal_code: 94111
	},
	items: [
		{
			item: "TC 100",
			description: "Toner Cartridge",
			quantity: 2,
			amount: 6000
		},
		{
			item: "USB_EXT",
			description: "USB Cable Extender",
			quantity: 1,
			amount: 2000
		}
	],
	subtotal: 8000,
	paid: 0,
	invoice_nr: 1234
};

router.get("/sample-pdf", (req, res) => {
	createInvoice(invoice, "invoice.pdf", res);
});

router.get("/search-product/:centerid/:customerid/:orderdate/:searchstr", (req, res) => {
	let searchstr = req.params.searchstr;
	let centerid = req.params.centerid;
	let customerid = req.params.customerid;
	let orderdate = req.params.orderdate;

	let sql = `select a.product_code as product_code, a.description, a.mrp, a.taxrate, b.available_stock,
	a.packetsize, a.unit_price, a.id, b.id as stock_pk,
	
(	  select concat(value,'~',type) from discount where   str_to_date('${orderdate}','%d-%m-%Y')  between str_to_date(startdate, '%d-%m-%Y') and str_to_date(enddate, '%d-%m-%Y') and
  customer_id = '${customerid}' and
  gst_slab = a.taxrate
) as disc_info
	
	
  from 
  product a, 
  stock b
  where 
  a.id = b.product_id and
  a.center_id = '${centerid}' and
  ( a.product_code like '%${searchstr}%' or
  a.description like '%${searchstr}%' ) limit 50 
  
 `;

	console.log("query TESTing > " + sql);

	connection.query(sql, function(err, data) {
		if (err) {
			console.log("object error " + err);
		} else {
			res.json(data);
		}
	});
});

//mgt
router.get("/search-product/:centerid/:searchstr", (req, res) => {
	let searchstr = req.params.searchstr;
	let centerid = req.params.centerid;

	let sql = `select a.product_code as product_code, a.description, a.mrp, a.taxrate, b.available_stock,
	a.packetsize, a.unit_price, a.id, b.id as stock_pk
  from 
  product a, 
  stock b
  where 
  a.id = b.product_id and
  a.center_id = '${centerid}' and
  ( a.product_code like '%${searchstr}%' or
  a.description like '%${searchstr}%' ) limit 50 
 `;

	//	console.log("query > " + sql);

	connection.query(sql, function(err, data) {
		if (err) {
			console.log("object error " + err);
		} else {
			res.json(data);
		}
	});
});

router.get("/search-customer/:centerid/:searchstr", (req, res) => {
	let searchstr = req.params.searchstr;
	let centerid = req.params.centerid;

	let sql = `select c.id, c.center_id, c.name, c.address1, c.address2, c.district, s.code, s.description,
	c.pin, c.gst, c.phone, c.mobile, c.mobile2, c.whatsapp,  c.email, c.isactive, c.billingstatus
	from 
	customer c,
	state s
	where 
	c.state_id = s.id and isactive = 'A' and center_id = '${centerid}' and ( c.name like '%${searchstr}%') limit 50`;

	// let sql = `
	// select *, s.code, s.description
	// from
	// customer c,
	// state s
	// where
	// c.state_id = s.id and
	// c.center_id = '${centerid}' and
	// c.isactive = 'A' and
	// ( c.name like '%${searchstr}%') limit 50 `;

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
	v.pin, v.gst, v.phone, v.mobile, v.mobile2, v.whatsapp, v.email, v.isactive, v.billingstatus  from 
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

router.get("/all-active-customers/:centerid", (req, res) => {
	let centerid = req.params.centerid;

	let sql = `select c.id, c.center_id, c.name, c.address1, c.address2, c.district, s.code, s.description,
	c.pin, c.gst, c.phone, c.mobile, c.mobile2, c.whatsapp, c.email, c.isactive, c.billingstatus  from 
	customer c,
	state s
	where 
	c.state_id = s.id and isactive = 'A' and center_id = ${centerid}`;

	connection.query(sql, function(err, data) {
		if (err) {
			console.log("sql exec failed.... " + err);
		} else {
			res.json(data);
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
	let received_date = yourJsonObj["orderrcvddt"];

	if (yourJsonObj["orderrcvddt"] !== "") {
		received_date = moment(yourJsonObj["orderrcvddt"]).format("YYYY-MM-DD");
	}

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

	// product_arr.forEach(function(k) {

	// });

	var month = moment().format("M");
	var day = moment().format("D");
	var year = moment().format("YYYY");

	let query = `
	INSERT INTO purchase ( center_id, vendor_id, invoice_no, invoice_date, 
		lr_no, lr_date, received_date, purchase_type, order_no, 
		order_date, total_qty, no_of_items, taxable_value, cgst, sgst, igst, 
		total_value, transport_charges, unloading_charges, misc_charges, net_total, no_of_boxes)
		VALUES
			( 1, '${vendorValue.id}', '${invoiceno}', '${invoicedate}', '${lr_no}', '${lr_date}', 
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
					( '${newPK}', '${k.product_id}', '${k.qty}', '${k.unit_price}', '${k.mrp}', '2020-01-16', '${k.taxrate}', '${k.igst}', '${k.cgst}', '${k.sgst}', '${k.taxable_value}', '${k.total_value}')
				
					`;

				connection.query(query1, function(err, data) {
					if (err) {
						console.log("object..." + err);
					} else {
						console.log("object... success");

						console.log("mrp_change_flag..." + `${k.mrp_change_flag}`);

						if (`${k.mrp_change_flag}` === "Y") {
							let upDate = new Date();
							todayYYMMDD = moment(upDate).format("YYYY-MM-DD");
							let query2 = `
							insert into stock (product_id, mrp, available_stock, open_stock, updateddate)
							values ('${k.product_id}', '${k.mrp}', '${k.qty}', 0, '${todayYYMMDD}')`;

							connection.query(query2, function(err, data) {
								if (err) {
									console.log("object..." + err);
								} else {
									console.log("object..stock update .");
								}
							});
						} else {
							let query2 = `
							update stock set available_stock =  available_stock + '${k.qty}'
	where product_id = '${k.product_id}' and mrp = '${k.mrp}' `;

							connection.query(query2, function(err, data) {
								if (err) {
									console.log("object..." + err);
								} else {
									console.log("object..stock update .");
								}
							});
						}
					}
				});
			});
		}
	});
	// 	});
});

router.post("/insert-sale-details", (req, res) => {
	let yourJsonObj = req.body;

	console.log(" insert-sale-details ..." + JSON.stringify(yourJsonObj));

	const customerValue = yourJsonObj["customer"];

	let invoiceyear = "";
	let invoicedate = yourJsonObj["invoicedate"];
	if (yourJsonObj["invoicedate"] !== "") {
		invoicedate = moment(yourJsonObj["invoicedate"]).format("YYYY-MM-DD");
		invoiceyear = moment(yourJsonObj["invoicedate"]).format("YY");
	}

	const no_of_items = yourJsonObj["noofitems"];
	const total_qty = yourJsonObj["totalqty"];
	const taxable_value = yourJsonObj["taxable_value"];
	const total_value = yourJsonObj["totalvalue"];
	const product_arr = yourJsonObj["productarr"];

	// const net_total = yourJsonObj["net_total"];

	const igst = yourJsonObj["igst"];
	const cgst = yourJsonObj["cgst"];
	const sgst = yourJsonObj["sgst"];
	const enqref = yourJsonObj["enqref"];

	var month = moment().format("M");
	var day = moment().format("D");
	var year = moment().format("YYYY");
	var syear = moment().format("YY");

	connection.beginTransaction(function(err) {
		if (err) {
			throw err;
		}

		let qryUpdateSqnc = `
	update financialyear set invseq = invseq + 1 where 
	center_id = '1' and  
	CURDATE() between str_to_date(startdate, '%d-%m-%Y') and str_to_date(enddate, '%d-%m-%Y')
	`;

		connection.query(qryUpdateSqnc, function(err, data) {
			if (err) {
				console.log("object..." + err);
			}
		});

		let query = `
	INSERT INTO sale (  center_id, customer_id, invoice_no, invoice_date, 
	 sale_type,  total_qty, no_of_items, taxable_value, cgst, sgst, igst, 
		total_value, net_total)
		VALUES
			(1, '${customerValue.id}', 
			
			(select concat('${invoiceyear}', "/", "1", "/", lpad(invseq, 5, "0")) from financialyear 
where 
center_id = 1 and  
CURDATE() between str_to_date(startdate, '%d-%m-%Y') and str_to_date(enddate, '%d-%m-%Y'))
			
			, '${invoicedate}', 
			'GST Inovoice',
		
			'${total_qty}', 
			'${no_of_items}',  
			'${taxable_value}', 
			'${cgst}', 
			'${sgst}', 
			'${igst}', 
			'${total_value}', 
	
			'${total_value}'
			
			)`;

		connection.query(query, function(err, data) {
			if (err) {
				return connection.rollback(function() {
					throw error;
				});
			}

			let newPK = data.insertId;

			product_arr.forEach(function(k) {
				let query1 = `

				INSERT INTO sale_detail(sale_id, product_id, qty, unit_price, mrp, batchdate, tax,
					igst, cgst, sgst, taxable_value, total_value)
				VALUES
					( '${newPK}', '${k.product_id}', '${k.qty}', '${k.unit_price}', '${k.mrp}', '2020-01-16', '${k.taxrate}', '${k.igst}', '${k.cgst}', '${k.sgst}', '${k.taxable_value}', '${k.total_value}')
				
					`;

				connection.query(query1, function(err, data) {
					if (err) {
						console.log("object..." + err);
					}

					let query2 = `
							update stock set available_stock =  available_stock - '${k.qty}'
	where product_id = '${k.product_id}' and id = '${k.stock_pk}' `;

					connection.query(query2, function(err, data) {
						if (err) {
							console.log("object..." + err);
						}

						let query3 = `
								update product set currentstock = (
									select sum(available_stock) from stock where product_id = '${k.product_id}')
									 `;
						connection.query(query3, function(err, data) {
							if (err) {
								console.log("object..." + err);
							}
						});
					});
				});
			});

			if (enqref !== 0) {
				let uenqsaleidqry = `update enquiry set 
				estatus = 'E',
				sale_id = '${newPK}'
				where 
				id =  '${enqref}' `;

				connection.query(uenqsaleidqry, function(err, data) {
					if (err) {
						console.log("object..." + err);
					} else {
						res.json({
							result: "success"
						});
					}
				});
			}
		});
		connection.commit(function(err) {
			if (err) {
				return connection.rollback(function() {
					throw err;
				});
			}
			console.log("success!");
		});
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

router.get("/get-customer-details/:enquiryid", (req, res) => {
	let enquiryid = req.params.enquiryid;

	console.log("object error......... " + enquiryid);

	let sql = `     select c.*
  from 
  enquiry em, 
customer c
where
em.customer_id = c.id and
em.id = ${enquiryid}`;

	connection.query(sql, function(err, data) {
		if (err) {
			console.log("object error " + err);
		} else {
			res.json(data);
		}
	});
});
