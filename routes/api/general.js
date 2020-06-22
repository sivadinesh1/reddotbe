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
	console.log("object >>>" + JSON.stringify(req.body));
	const [centerid, customerid, orderdate, searchstr] = Object.values(req.body);

	let sql = `select a.product_code as product_code, a.description, a.mrp, a.taxrate, b.available_stock,
	a.packetsize as qty, a.unit_price, a.id as product_id, b.id as stock_pk, a.rackno,
	IFNULL(
(	  select concat(value,'~',type) from discount where   str_to_date('${orderdate}','%d-%m-%Y')  between str_to_date(startdate, '%d-%m-%Y') and str_to_date(enddate, '%d-%m-%Y') and
  customer_id = '${customerid}' and
  gst_slab = a.taxrate
	) , '0~NET') as disc_info
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

router.post("/search-product", (req, res) => {
	const [centerid, searchstr] = Object.values(req.body);

	let sql = `select a.product_code as product_code, a.description, a.mrp, a.taxrate, b.available_stock,
	a.packetsize, a.unit_price, a.id as product_id, b.id as stock_pk, a.packetsize as qty, a.rackno
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
