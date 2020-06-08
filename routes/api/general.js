const express = require("express");
const router = express.Router();

const mysql = require("mysql");
const moment = require("moment");

const { handleError, ErrorHandler } = require("./../helpers/error");

const { createInvoice } = require("./createInvoice.js");
var pool = require("./../helpers/db");

const invoice = {
	shipping: {
		name: "John Doe",
		address: "1234 Main Street",
		city: "San Francisco",
		state: "CA",
		country: "US",
		postal_code: 94111,
	},
	items: [
		{
			item: "TC 100",
			description: "Toner Cartridge",
			quantity: 2,
			amount: 6000,
		},
		{
			item: "USB_EXT",
			description: "USB Cable Extender",
			quantity: 1,
			amount: 2000,
		},
	],
	subtotal: 8000,
	paid: 0,
	invoice_nr: 1234,
};

router.get("/sample-pdf", (req, res) => {
	createInvoice(invoice, "invoice.pdf", res);
});

router.post("/search-product-information", (req, res) => {
	// let searchstr = req.params.searchstr;
	// let centerid = req.params.centerid;
	// let customerid = req.params.customerid;
	// let orderdate = req.params.orderdate;
	console.log("object >>>" + JSON.stringify(req.body));
	const [centerid, customerid, orderdate, searchstr] = Object.values(req.body);

	let sql = `select a.product_code as product_code, a.description, a.mrp, a.taxrate, b.available_stock,
	a.packetsize as qty, a.unit_price, a.id as product_id, b.id as stock_pk,
	
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

	console.log("search-product-information > " + sql);

	pool.query(sql, function (err, data) {
		if (err) {
			return handleError(new ErrorHandler("500", "Error fetching search products."), res);
		} else {
			return res.json(data);
		}
	});
});

//mgt
// router.get("/search-product/:centerid/:searchstr", (req, res) => {
// 	let searchstr = req.params.searchstr;
// 	let centerid = req.params.centerid;

// 	let sql = `select a.product_code as product_code, a.description, a.mrp, a.taxrate, b.available_stock,
// 	a.packetsize, a.unit_price, a.id as product_id, b.id as stock_pk, a.packetsize as qty
//   from
// 	product a
// 	LEFT outer JOIN   stock b
// 	ON b.product_id = a.id
//   where
//   a.center_id = '${centerid}' and
//   ( a.product_code like '%${searchstr}%' or
//   a.description like '%${searchstr}%' ) limit 50
//  `;

// 	console.log("query > " + sql);

// 	pool.query(sql, function (err, data) {
// 		if (err) {
// 			return handleError(new ErrorHandler("500", "Error fetching search products."), res);
// 		} else {
// 			return res.json(data);
// 		}
// 	});
// });

router.post("/search-product", (req, res) => {
	const [centerid, searchstr] = Object.values(req.body);

	let sql = `select a.product_code as product_code, a.description, a.mrp, a.taxrate, b.available_stock,
	a.packetsize, a.unit_price, a.id as product_id, b.id as stock_pk, a.packetsize as qty
  from 
	product a
	LEFT outer JOIN   stock b
	ON b.product_id = a.id
  where 
  a.center_id = '${centerid}' and
  ( a.product_code like '%${searchstr}%' or
  a.description like '%${searchstr}%' ) limit 50 
 `;

	console.log("query > " + sql);

	pool.query(sql, function (err, data) {
		if (err) {
			return handleError(new ErrorHandler("500", "Error fetching search products."), res);
		} else {
			return res.json(data);
		}
	});
});

router.get("/search-customer/:centerid/:searchstr", (req, res) => {
	let searchstr = req.params.searchstr;
	let centerid = req.params.centerid;

	let sql = `select c.id, c.center_id, c.name, c.address1, c.address2, c.district, s.code, s.description,
	c.pin, c.gst, c.phone, c.mobile, c.mobile2, c.whatsapp,  c.email, c.isactive
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

	pool.query(sql, function (err, data) {
		if (err) {
			return handleError(new ErrorHandler("500", "Error fetching search customers."), res);
		} else {
			return res.json(data);
		}
	});
});

//mgt
router.get("/inventory/all", (req, res) => {
	let sql = `select p.product_code, p.description, p.mrp, s.available_stock
  from product p, 
       stock s 
  where p.product_code= s.product_code`;

	pool.query(sql, function (err, data) {
		if (err) {
			return handleError(new ErrorHandler("500", "Error fetching inventory"), res);
		} else {
			return res.json(data);
		}
	});
});

//mgt
router.get("/all-clients", (req, res) => {
	let sql = `select * from customer where isactive = 'A'`;

	pool.query(sql, function (err, data) {
		if (err) {
			return handleError(new ErrorHandler("500", "Error fetching all clients."), res);
		} else {
			return res.json(data);
		}
	});
});

//mgt
router.get("/all-active-vendors/:centerid", (req, res) => {
	let centerid = req.params.centerid;

	let sql = `select v.id, v.center_id, v.name, v.address1, v.address2, v.address3, v.district, s.id as state_id, s.code, s.description as state,
	v.pin, v.gst, v.phone, v.mobile, v.mobile2, v.whatsapp, v.email, v.isactive  from 
	vendor v,
	state s
	where 
	v.state_id = s.id and isactive = 'A' and center_id = ${centerid} order by v.name`;

	console.log("all-active-vendors" + sql);

	pool.query(sql, function (err, data) {
		if (err) {
			return handleError(new ErrorHandler("500", "Error fetching active vendors."), res);
		} else {
			res.json(data);
		}
	});
});

router.get("/all-active-customers/:centerid", (req, res) => {
	let centerid = req.params.centerid;

	let sql = `select c.id, c.center_id, c.name, c.address1, c.address2, c.district, s.code, s.description,
	c.pin, c.gst, c.phone, c.mobile, c.mobile2, c.whatsapp, c.email, c.isactive  from 
	customer c,
	state s
	where 
	c.state_id = s.id and isactive = 'A' and center_id = ${centerid}`;

	pool.query(sql, function (err, data) {
		if (err) {
			return handleError(new ErrorHandler("500", "Error fetching inventory"), res);
		} else {
			return res.json(data);
		}
	});
});

router.post("/add-parts-details-enquiry", (req, res) => {
	console.log(" inside apply jobs ...");
	let yourJsonObj = req.body;

	var objectKeysArray = Object.keys(yourJsonObj);
	objectKeysArray.forEach(function (objKey) {
		console.log("object..KEY..." + JSON.stringify(objKey));
		var objValue = yourJsonObj[objKey];
		console.log("object..VAL." + JSON.stringify(objValue));

		var today = new Date();
		today = moment(today).format("YYYY-MM-DD HH:mm:ss");
		let query = `INSERT INTO enquiry_detail ( enquiry_id, item_code, qty) values ( '${objValue.enquiryid}','${objValue.partno}','${objValue.quantity}')`;

		pool.query(query, function (err, data) {
			if (err) {
				return handleError(new ErrorHandler("500", "Error fetching inventory"), res);
			}
		});
	});
});

// router.post("/insert-purchase-details", (req, res) => {
// 	let yourJsonObj = req.body;

// 	console.log("dinesh *** " + JSON.stringify(yourJsonObj));

// 	const purchase_id = yourJsonObj["purchaseid"];

// 	const vendorValue = yourJsonObj["vendor"];

// 	const invoiceno = yourJsonObj["invoiceno"];

// 	let invoicedate = yourJsonObj["invoicedate"];
// 	if (yourJsonObj["invoicedate"] !== "") {
// 		invoicedate = moment(yourJsonObj["invoicedate"]).format("DD-MM-YYYY");
// 	}

// 	let order_date = yourJsonObj["orderdate"];

// 	if (yourJsonObj["orderdate"] !== "") {
// 		order_date = moment(yourJsonObj["orderdate"]).format("DD-MM-YYYY");
// 	}

// 	let lr_date = yourJsonObj["lrdate"];
// 	if (yourJsonObj["lrdate"] !== "") {
// 		lr_date = moment(yourJsonObj["lrdate"]).format("DD-MM-YYYY");
// 	}

// 	const no_of_boxes = yourJsonObj["noofboxes"];
// 	let received_date = yourJsonObj["orderrcvddt"];

// 	if (yourJsonObj["orderrcvddt"] !== "") {
// 		received_date = moment(yourJsonObj["orderrcvddt"]).format("DD-MM-YYYY");
// 	}

// 	const lr_no = yourJsonObj["lrno"];
// 	const order_no = yourJsonObj["orderno"];

// 	const no_of_items = yourJsonObj["noofitems"];
// 	const total_qty = yourJsonObj["totalqty"];
// 	const taxable_value = yourJsonObj["taxable_value"];
// 	const total_value = yourJsonObj["totalvalue"];
// 	const product_arr = yourJsonObj["productarr"];
// 	const transport_charges = yourJsonObj["transport_charges"];
// 	const unloading_charges = yourJsonObj["unloading_charges"];
// 	const misc_charges = yourJsonObj["misc_charges"];
// 	const net_total = yourJsonObj["net_total"];

// 	const igst = yourJsonObj["igst"];
// 	const cgst = yourJsonObj["cgst"];
// 	const sgst = yourJsonObj["sgst"];

// 	const status = yourJsonObj["status"];

// 	var today = new Date();
// 	today = moment(today).format("DD-MM-YYYY");

// 	var month = moment().format("M");
// 	var day = moment().format("D");
// 	var year = moment().format("YYYY");

// 	let insQry = `
// 	INSERT INTO purchase ( center_id, vendor_id, invoice_no, invoice_date,
// 		lr_no, lr_date, received_date, purchase_type, order_no,
// 		order_date, total_qty, no_of_items, taxable_value, cgst, sgst, igst,
// 		total_value, transport_charges, unloading_charges, misc_charges, net_total, no_of_boxes, status, stock_inwards_datetime)
// 		VALUES
// 			( 1, '${vendorValue.id}', '${invoiceno}', '${invoicedate}', '${lr_no}', '${lr_date}',
// 			'${received_date}',
// 			'GST Inovoice',
// 			'${order_no}',
// 			'${order_date}',
// 			'${total_qty}',
// 			'${no_of_items}',
// 			'${taxable_value}',
// 			'${cgst}',
// 			'${sgst}',
// 			'${igst}',
// 			'${total_value}',
// 			'${transport_charges}',
// 			'${unloading_charges}',
// 			'${misc_charges}',
// 			'${net_total}',
// 			'${no_of_boxes}', '${status}' , '${today}'
// 			)`;

// 	let updQry = `
// 	update purchase
// 	set
// 	center_id = 1,
// 	vendor_id = '${vendorValue.id}',
// 	invoice_no = '${invoiceno}',
// 	invoice_date = '${invoicedate}',
// 	lr_no = '${lr_no}',
// 	lr_date = '${lr_date}',
// 	received_date = '${received_date}',
// 	purchase_type = 'GST Inovoice',
// 	order_no = '${order_no}',
// 	order_date = '${order_date}',
// 	total_qty = '${total_qty}',
// 	no_of_items = '${no_of_items}',
// 	taxable_value = '${taxable_value}',
// 	cgst = '${cgst}',
// 	sgst = '${sgst}',
// 	igst = '${igst}',
// 	total_value = '${total_value}',
// 	transport_charges = '${transport_charges}',
// 	unloading_charges = '${unloading_charges}',
// 	misc_charges = '${misc_charges}',
// 	net_total = '${net_total}',
// 	no_of_boxes = '${no_of_boxes}',
// 	status =  '${status}',
// 	stock_inwards_datetime =  '${today}'
// 	where
// 		id = '${purchase_id}'

// 	`;

// 	if (purchase_id === "") {
// 		query = insQry;
// 	} else if (purchase_id != "") {
// 		query = updQry;
// 	}

// 	console.log("Query type ++ " + query);

// 	pool.query(query, function (err, data) {
// 		if (err) {
// 			console.log("print error 1 " + err);
// 			return handleError(new ErrorHandler("500", "Error inserting purchase"), res);
// 		} else {
// 			if (purchase_id === "") {
// 				newPK = data.insertId;
// 			} else if (purchase_id != "") {
// 				newPK = purchase_id;
// 			}

// 			product_arr.forEach(function (k) {
// 				let insQuery1 = `

// 				INSERT INTO purchase_detail(purchase_id, product_id, qty, unit_price, mrp, batchdate, tax,
// 					igst, cgst, sgst, taxable_value, total_value)
// 				VALUES
// 					( '${newPK}', '${k.product_id}', '${k.qty}', '${k.unit_price}', '${k.mrp}', '${moment().format("DD-MM-YYYY")}', '${k.taxrate}', '${k.igst}', '${
// 					k.cgst
// 				}', '${k.sgst}', '${k.taxable_value}', '${k.total_value}')

// 					`;

// 				let updQuery1 = `

// 					update purchase_detail
// 					set purchase_id = '${k.purchase_id}',
// 					product_id = '${k.product_id}',
// 					qty = '${k.qty}',
// 					unit_price = '${k.unit_price}',
// 					mrp = '${k.mrp}',
// 					batchdate = '${moment().format("DD-MM-YYYY")}',
// 					tax = '${k.taxrate}',
// 					igst = '${k.igst}',
// 					cgst = '${k.cgst}',
// 					sgst = '${k.sgst}',
// 					taxable_value =  '${k.taxable_value}',
// 					total_value = '${k.total_value}'
// 					where
// 					id = '${k.pur_det_id}' `;

// 				if (k.pur_det_id === "") {
// 					query1 = insQuery1;
// 				} else {
// 					query1 = updQuery1;
// 				}

// 				pool.query(query1, function (err, data) {
// 					if (err) {
// 						return handleError(new ErrorHandler("500", "Error inserting purchase"), res);
// 					} else {
// 						if (`${k.mrp_change_flag}` === "Y") {
// 							let upDate = new Date();
// 							todayYYMMDD = moment(upDate).format("YYYY-MM-DD");
// 							let query2 = `
// 							insert into stock (product_id, mrp, available_stock, open_stock, updateddate)
// 							values ('${k.product_id}', '${k.mrp}', '${k.qty}', 0, '${todayYYMMDD}')`;

// 							pool.query(query2, function (err, data) {
// 								if (err) {
// 									return handleError(new ErrorHandler("500", "Error Inserting purchase"), res);
// 								} else {
// 									console.log("object..stock update .");
// 								}
// 							});
// 						} else {
// 							if (status === "C") {
// 								let qty_to_update = k.qty - k.old_val;
// 								console.log("old val > " + k.old_val);
// 								console.log("qty val > " + k.qty);

// 								let query2 = `

// 								update stock set available_stock =  available_stock + '${qty_to_update}'
// 		where product_id = '${k.product_id}' and mrp = '${k.mrp}' `;

// 								pool.query(query2, function (err, data) {
// 									if (err) {
// 										console.log("object..." + err);
// 									} else {
// 										console.log("object..stock update .");
// 									}
// 								});
// 							}
// 						}
// 					}
// 				});
// 			});
// 			return res.json({
// 				result: "success",
// 			});
// 		}
// 	});
// 	// 	});
// });

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

	pool.query(sql, function (err, data) {
		if (err) {
			console.log("object error " + err);
			return handleError(new ErrorHandler("500", "Error fetching get enquiry"), res);
		} else {
			return res.json(data);
		}
	});
});

router.get("/get-customer-details/:enquiryid", (req, res) => {
	let enquiryid = req.params.enquiryid;

	let sql = `     select c.*
  from 
  enquiry em, 
customer c
where
em.customer_id = c.id and
em.id = ${enquiryid}`;

	pool.query(sql, function (err, data) {
		if (err) {
			return handleError(new ErrorHandler("404", "Error fetching get customer details"), res);
		} else {
			return res.json(data);
		}
	});
});

router.post("/update-taxrate", (req, res) => {
	let taxrate = req.body.taxrate;
	let id = req.body.productid;

	console.log("object>>> update-giveqty-enquiry-details");

	let query = `update product 
	set 
	taxrate = '${taxrate}' 
	where id = '${id}' `;

	pool.query(query, function (err, data) {
		if (err) {
			return handleError(new ErrorHandler("500", "Error updating update tax rate"), res);
		} else {
		}
	});
});

router.get("/purchase/:purchaseid/:status", (req, res) => {
	try {
		let centerid = req.params.centerid;

		let sql = `select c.id, c.center_id, c.name, c.address1, c.address2, c.district, s.code, s.description,
	c.pin, c.gst, c.phone, c.mobile, c.mobile2, c.whatsapp, c.email, c.isactive  from 
	customer c,
	state s
	where 
	c.state_id = s.id and isactive = 'A' and center_id = ${centerid}`;

		pool.query(sql, function (err, data) {
			if (err) {
				return handleError(new ErrorHandler("500", "Error fetching purchase"), res);
			} else {
				res.json(data);
			}
		});
	} catch (error) {
		return handleError(new ErrorHandler("500", "Error processing request"), res);
	}
});
