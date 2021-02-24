const express = require('express');
const router = express.Router();

const mysql = require('mysql');
const moment = require('moment');
const logger = require('../../routes/helpers/log4js');

const { handleError, ErrorHandler } = require('./../helpers/error');

const { getSearchCustomers } = require('../modules/customers/customers.js');
const { getSearchVendors } = require('../modules/vendors/vendors.js');

const { createInvoice } = require('./createInvoice.js');
var pool = require('./../helpers/db');
const {
	getAllBrands,
	getBrandsMissingDiscountsByCustomer,
	getSearchBrands,
} = require('../modules/brands/brands');

const invoice = {
	shipping: {
		name: 'John Doe',
		address: '1234 Main Street',
		city: 'San Francisco',
		state: 'CA',
		country: 'US',
		postal_code: 94111,
	},
	items: [
		{
			item: 'TC 100',
			description: 'Toner Cartridge',
			quantity: 2,
			amount: 6000,
		},
		{
			item: 'USB_EXT',
			description: 'USB Cable Extender',
			quantity: 1,
			amount: 2000,
		},
	],
	subtotal: 8000,
	paid: 0,
	invoice_nr: 1234,
};

router.get('/sample-pdf', (req, res) => {
	createInvoice(invoice, 'invoice.pdf', res);
});

router.post('/search-product-information', (req, res) => {
	const [centerid, customerid, orderdate, searchstr] = Object.values(req.body);

	// initially checks if product has custom discount for the selected customer. if yes, takes that discount
	// if no custom discount available, it then gets the default discount. brand = 0 for defaults

	let sql = ` select a.product_code as product_code, a.description, b.mrp, a.taxrate, b.available_stock,
	a.packetsize as qty, a.unit_price, a.id as product_id, b.id as stock_pk, a.rackno,
IFNULL(
(
select concat(value,'~',type) 
from discount 
where str_to_date('${orderdate}','%d-%m-%Y')  
between str_to_date(startdate, '%d-%m-%Y') and str_to_date(enddate, '%d-%m-%Y') and
customer_id = '${customerid}' and
gst_slab = a.taxrate and
a.brand_id = discount.brand_id and
discount.brand_id = a.brand_id
), 
(  select concat(value,'~',type) 
from discount 
where str_to_date('${orderdate}','%d-%m-%Y')  
between str_to_date(startdate, '%d-%m-%Y') and str_to_date(enddate, '%d-%m-%Y') and
customer_id = '${customerid}' and
gst_slab = a.taxrate and
discount.brand_id = 0 )
	
	) as disc_info,
	brand.name as name
from 
product a, 
stock b,
brand
where 
brand.id = a.brand_id and 
a.id = b.product_id and
a.center_id = '${centerid}' and
( a.product_code like '%${searchstr}%' or
a.description like '%${searchstr}%' ) limit 50 
`;

	pool.query(sql, function (err, data) {
		if (err) {
			return handleError(
				new ErrorHandler('500', 'Error fetching search products.'),
				res
			);
		} else {
			return res.json(data);
		}
	});
});

router.post('/search-product', (req, res) => {
	const [centerid, searchstr, searchby] = Object.values(req.body);

	let sql = '';

	sql = `select a.product_code as product_code, a.description, b.mrp, a.taxrate, b.available_stock,
		a.packetsize, a.unit_price, a.purchase_price as purchase_price, a.id as product_id, b.id as stock_pk, a.packetsize as qty, a.rackno, bd.name,
		bd.id as brand_id, a.unit as uom, a.hsncode as hsncode, a.minqty as minqty, a.avgpurprice as avgpurprice,
		a.unit_price as unit_price, a.salesprice as salesprice,  a.maxdiscount as maxdiscount
		from 
		brand bd,
		product a
		LEFT outer JOIN   stock b
		ON b.product_id = a.id
		where 
		a.center_id = '${centerid}' and
		a.brand_id = bd.id and
		( a.product_code like '%${searchstr}%' or
		a.description like '%${searchstr}%' ) limit 50 
	 `;

	pool.query(sql, function (err, data) {
		if (err) {
			return handleError(
				new ErrorHandler('500', 'Error fetching search products.'),
				res
			);
		} else {
			return res.status(200).json(data);
		}
	});
});

router.post('/search-customer', (req, res) => {
	const [centerid, searchstr] = Object.values(req.body);

	getSearchCustomers(centerid, searchstr, (err, data) => {
		if (err) {
			return handleError(
				new ErrorHandler('500', 'Error fetching customer details.'),
				res
			);
		} else {
			return res.status(200).json(data);
		}
	});
});

router.post('/search-vendor', (req, res) => {
	const [centerid, searchstr] = Object.values(req.body);

	getSearchVendors(centerid, searchstr, (err, data) => {
		if (err) {
			return handleError(
				new ErrorHandler('500', 'Error fetching customer details.'),
				res
			);
		} else {
			return res.status(200).json(data);
		}
	});
});

router.post('/search-brand', async (req, res) => {
	const [centerid, searchstr] = Object.values(req.body);
	let rows = await getSearchBrands(centerid, searchstr);
	return res.status(200).json(rows);
});

//mgt
router.get('/inventory/all', (req, res) => {
	let sql = `select p.product_code, p.description, p.mrp, s.available_stock
  from product p, 
       stock s 
  where p.product_code= s.product_code`;

	pool.query(sql, function (err, data) {
		if (err) {
			return handleError(
				new ErrorHandler('500', 'Error fetching inventory'),
				res
			);
		} else {
			return res.json(data);
		}
	});
});

//mgt
router.get('/all-clients', (req, res) => {
	let sql = `select * from customer where isactive = 'A'`;

	pool.query(sql, function (err, data) {
		if (err) {
			return handleError(
				new ErrorHandler('500', 'Error fetching all clients.'),
				res
			);
		} else {
			return res.json(data);
		}
	});
});

//mgt
router.get('/all-active-vendors/:centerid', (req, res) => {
	let centerid = req.params.centerid;

	let sql = `select v.id, v.center_id, v.name, v.address1, v.address2, v.address3, v.district, s.id as state_id, s.code, s.description as state,
	v.pin, v.gst, v.phone, v.mobile, v.mobile2, v.whatsapp, v.email, v.isactive, v.credit_amt,
	v.balance_amt, 
	DATE_FORMAT(v.last_paid_date, '%d-%b-%Y') as last_paid_date
	from 
	vendor v,
	state s
	where 
	v.state_id = s.id and isactive = 'A' and center_id = ${centerid} order by v.name`;

	pool.query(sql, function (err, data) {
		if (err) {
			return handleError(
				new ErrorHandler('500', 'Error fetching active vendors.'),
				res
			);
		} else {
			res.json(data);
		}
	});
});

// get all active brands
router.get('/all-active-brands/:centerid/:status', (req, res) => {
	getAllBrands(req.params.centerid, req.params.status, (err, rows) => {
		if (err) {
			return handleError(
				new ErrorHandler('500', 'Error fetching customer details.'),
				res
			);
		} else {
			return res.json(rows);
		}
	});
});

router.get('/vendor-exists/:name', (req, res) => {
	let name = req.params.name;

	let sql = `select * from vendor v where 
	v.name = '${name}' `;

	pool.query(sql, function (err, data) {
		if (err) {
			return handleError(new ErrorHandler('500', 'Error vendor exists.'), res);
		} else {
			return res.status(200).json({
				result: data,
			});
		}
	});
});

router.get('/brand-exists/:name/:center_id', (req, res) => {
	let name = req.params.name;
	let center_id = req.params.center_id;

	let sql = `select * from brand b where 
	b.name = '${name}' and b.center_id = '${center_id}' `;

	pool.query(sql, function (err, data) {
		if (err) {
			return handleError(new ErrorHandler('500', 'Error brand exists.'), res);
		} else {
			return res.status(200).json({
				result: data,
			});
		}
	});
});

router.get('/customer-exists/:name', (req, res) => {
	let name = req.params.name;

	let sql = `select * from customer c where 
	c.name = '${name}' `;

	pool.query(sql, function (err, data) {
		if (err) {
			return handleError(
				new ErrorHandler('500', 'Error Customer exists.'),
				res
			);
		} else {
			return res.status(200).json({
				result: data,
			});
		}
	});
});

router.get('/brand-delete/:id', (req, res) => {
	let id = req.params.id;

	let sql = `update brand set isactive = 'D' where id = '${id}' `;

	pool.query(sql, function (err, data) {
		if (err) {
			return handleError(new ErrorHandler('500', 'Error delete brand'), res);
		} else {
			return res.status(200).json({
				result: data,
			});
		}
	});
});

router.get('/enquiry-delete/:id', (req, res) => {
	let id = req.params.id;

	let sql = `update enquiry set estatus = 'X' where id = '${id}' `;

	pool.query(sql, function (err, data) {
		if (err) {
			return handleError(new ErrorHandler('500', 'Error delete vendor'), res);
		} else {
			return res.status(200).json({
				result: data,
			});
		}
	});
});

router.get('/vendor-delete/:id', (req, res) => {
	let id = req.params.id;

	let sql = `update vendor set isactive = 'D' where id = '${id}' `;

	pool.query(sql, function (err, data) {
		if (err) {
			return handleError(new ErrorHandler('500', 'Error delete vendor'), res);
		} else {
			return res.status(200).json({
				result: data,
			});
		}
	});
});

// get all active brands
router.get(
	'/brands-missing-discounts/:centerid/:status/:customerid',
	(req, res) => {
		getBrandsMissingDiscountsByCustomer(
			req.params.centerid,
			req.params.status,
			req.params.customerid,
			(err, rows) => {
				if (err) {
					return handleError(
						new ErrorHandler('500', 'Error fetching customer details.'),
						res
					);
				} else {
					return res.json(rows);
				}
			}
		);
	}
);

router.get('/all-active-customers/:centerid', (req, res) => {
	let centerid = req.params.centerid;

	let sql = `select c.id, c.center_id, c.name, c.address1, c.address2, c.district, s.id as state_id, s.code, s.description,
	c.pin, c.gst, c.phone, c.mobile, c.mobile2, c.whatsapp, c.email, 
	c.isactive, c.credit_amt as credit_amt, c.balance_amt as balance_amt, 
	DATE_FORMAT(c.last_paid_date, '%d-%b-%Y') as last_paid_date
	from 
	customer c,
	state s
	where 
	c.state_id = s.id and isactive = 'A' and center_id = ${centerid} 	order by name `;

	pool.query(sql, function (err, data) {
		if (err) {
			return handleError(
				new ErrorHandler('500', 'Error fetching inventory'),
				res
			);
		} else {
			return res.json(data);
		}
	});
});

router.post('/add-parts-details-enquiry', (req, res) => {
	let yourJsonObj = req.body;

	var objectKeysArray = Object.keys(yourJsonObj);
	objectKeysArray.forEach(function (objKey) {
		var objValue = yourJsonObj[objKey];

		let query = `INSERT INTO enquiry_detail ( enquiry_id, item_code, qty) values ( '${objValue.enquiryid}','${objValue.partno}','${objValue.quantity}')`;

		pool.query(query, function (err, data) {
			if (err) {
				return handleError(
					new ErrorHandler('500', 'Error fetching inventory'),
					res
				);
			}
		});
	});
});

module.exports = router;

router.get('/get-enquiry/:enquiryid', (req, res) => {
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
			return handleError(
				new ErrorHandler('500', 'Error fetching get enquiry'),
				res
			);
		} else {
			return res.json(data);
		}
	});
});

router.get('/get-customer-details/:enquiryid', (req, res) => {
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
			return handleError(
				new ErrorHandler('404', 'Error fetching get customer details'),
				res
			);
		} else {
			return res.json(data);
		}
	});
});

router.post('/update-taxrate', (req, res) => {
	let taxrate = req.body.taxrate;
	let id = req.body.productid;

	let query = `update product 
	set 
	taxrate = '${taxrate}' 
	where id = '${id}' `;

	pool.query(query, function (err, data) {
		if (err) {
			return handleError(
				new ErrorHandler('500', 'Error updating update tax rate'),
				res
			);
		} else {
		}
	});
});

router.get('/purchase/:purchaseid/:status', (req, res) => {
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
				return handleError(
					new ErrorHandler('500', 'Error fetching purchase'),
					res
				);
			} else {
				res.json(data);
			}
		});
	} catch (error) {
		return handleError(
			new ErrorHandler('500', 'Error processing request'),
			res
		);
	}
});

//mgt
router.get('/all-pymt-modes/:center_id/:status', (req, res) => {
	let sql = `select * from payment_mode where center_id = '${req.params.center_id}' and is_active = '${req.params.status}'`;

	pool.query(sql, function (err, data) {
		if (err) {
			return handleError(
				new ErrorHandler('500', 'Error fetching all all-pymt-modes.'),
				res
			);
		} else {
			return res.json(data);
		}
	});
});
