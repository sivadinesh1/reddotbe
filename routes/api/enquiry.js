/** @format */

const express = require('express');
const enquiryRoute = express.Router();
const { handleError, ErrorHandler } = require('./../helpers/error');
const { toTimeZone, currentTimeInTimeZone } = require('./../helpers/utils');

var pool = require('./../helpers/db');
const moment = require('moment');
const logger = require('../../routes/helpers/log4js');

const {
	insertEnquiryDetail,
	fetchEnquiryDetailByEnqId,
	fetchCustomerDetailsByEnqId,
	updateEnquiryDetail,
	insertBackOrder,
	updateEnquiry,
	getSuccessfullyProcessedItems,
} = require('../modules/enquiry/enquiry');

enquiryRoute.post('/draft-enquiry', (req, res) => {
	let jsonObj = req.body;

	// let today = new Date();

	// let now = new Date();

	//	now = currentTimeInTimeZone('Asia/Kolkata', 'YYYY-MM-DD HH:mm:ss');

	var objectKeysArray = Object.keys(jsonObj);
	objectKeysArray.forEach(function (objKey) {
		var objValue = jsonObj[objKey];

		// first update enquiry table with STATUS = 'D'
		let upQry1 = `update enquiry set estatus = 'D' where id = '${objValue.enquiry_id}' `;

		pool.query(upQry1, function (err, data) {
			if (err) {
				return handleError(new ErrorHandler('500', '/draft-enquiry update enquiry', err), res);
			}
		});

		// then update enquiry details table with STATUS = 'D' & with updated values
		let upQuery1 = `update enquiry_detail
		set
		product_id = '${objValue.product_id}',
		stock_id = ${objValue.stockid},
		giveqty = '${objValue.giveqty}',
		processed = '${objValue.processed}',
		status = 'D'
		where id = '${objValue.id}' `;

		let upQuery2 = `update enquiry_detail
			set
			product_id = null,
			stock_id = null,
			giveqty = '${objValue.giveqty}',
			processed = '${objValue.processed}',
			status = 'D'
			where id = '${objValue.id}' `;

		let uQrys = objValue.product_id === null ? upQuery2 : upQuery1;

		pool.query(uQrys, function (err, data) {
			if (err) {
				return handleError(new ErrorHandler('500', '/draft-enquiry update enquiry_detail', err), res);
			}
		});
	});

	res.json({
		result: 'success',
	});
});

enquiryRoute.post('/move-to-sale', async (req, res) => {
	let jsonObj = req.body.enquries;
	let userid = req.body.userid;

	let today = new Date();
	let now = new Date();

	today = currentTimeInTimeZone('Asia/Kolkata', 'YYYY-MM-DD HH:mm:ss');
	now = currentTimeInTimeZone('Asia/Kolkata', 'DD-MM-YYYY');

	var objectKeysArray = Object.keys(jsonObj);

	let idx = 1;

	// iterate each record from enquiry detail
	objectKeysArray.forEach(async (objKey, index) => {
		var objValue = jsonObj[objKey];

		/** No Product Id, obviously its a backorder */
		if (objValue.product_id === '' || objValue.product_id === null) {
			// b - full back order
			// updt enq_det_tbl status as B , giveqty = 0
			// insert backorder tbl with reason prodcut code not found

			let result = await updateEnquiryDetail('', '', '0', '', 'B', objValue.id, userid, res);
			let result1 = await insertBackOrder(
				objValue.center_id,
				objValue.customer_id,
				objValue.id,
				objValue.askqty,
				'Product Code Not found',
				'O',
				userid,
				res,
			);
		} else if (objValue.askqty > objValue.giveqty && objValue.giveqty === 0) {
			// item code is present but given qty is 0, so effectively this goes in to backorder straight

			const bqty = objValue.askqty - objValue.giveqty;

			let result = await updateEnquiryDetail(objValue.product_id, objValue.stockid, '0', objValue.processed, 'B', objValue.id, userid, res);

			let result1 = await insertBackOrder(objValue.center_id, objValue.customer_id, objValue.id, bqty, 'Zero Quantity Alloted', 'O', userid, res);
		} else if (objValue.askqty > objValue.giveqty && objValue.giveqty !== 0) {
			// p - partial fullfilment, customer asks 100 Nos, given 50 Nos
			// updt enq_det_tbl status as P (Partial), give qty = actual given
			// insert backorder tbl with reason Partial fullfillmeent

			const bqty = objValue.askqty - objValue.giveqty;

			let result = await updateEnquiryDetail(
				objValue.product_id,
				objValue.stockid,
				objValue.giveqty,
				objValue.processed,
				'P',
				objValue.id,
				userid,
				res,
			);

			let result1 = await insertBackOrder(objValue.center_id, objValue.customer_id, objValue.id, bqty, 'Partial fullfillmeent', 'O', userid, res);
		} else if (objValue.giveqty >= objValue.askqty && objValue.product_id !== '' && objValue.product_id !== null) {
			// F- fullfilled
			// updt enq_det_tbl status as F, give qty = actual given

			let result = await updateEnquiryDetail(
				objValue.product_id,
				objValue.stockid,
				objValue.giveqty,
				objValue.processed,
				'F',
				objValue.id,
				userid,
				res,
			);
		}

		if (objectKeysArray.length === idx) {
			finalEnquiryStatusUpdte(jsonObj, userid, res);
		}
		idx = idx + 1;
	});
});

const finalEnquiryStatusUpdte = async (jsonObj, userid, res) => {
	let rows = await getSuccessfullyProcessedItems(jsonObj[0].enquiry_id);

	let finalresult = '';

	if (rows === 0) {
		// E - executed means will not appear in open enquiry page
		finalresult = await updateEnquiry('E', jsonObj[0].enquiry_id, userid, res);
	} else {
		// P - processed, ready for sale in open qneuiry page
		finalresult = await updateEnquiry('P', jsonObj[0].enquiry_id, userid, res);
	}

	if (finalresult === 'success') {
		res.json({
			result: 'success',
		});
	} else {
		res.json({
			result: 'failure',
		});
	}
};

// todo this end point not used, check and delete
enquiryRoute.post('/update-giveqty-enquiry-details', (req, res) => {
	let giveqty = req.body.giveqty;
	let id = req.body.enqdetailid;

	let query = `update enquiry_detail
	set
	giveqty = '${giveqty}'
	where id = '${id}' `;

	pool.query(query, function (err, data) {
		if (err) {
			return handleError(new ErrorHandler('500', 'Error Updating enquiry details move to sale.', err), res);
		} else {
		}
	});
});

enquiryRoute.get('/update-customer/:id/:enqid', (req, res) => {
	let id = req.params.id;
	let enqid = req.params.enqid;
	let query = `update enquiry
	set
	customer_id = '${id}'
	where id = '${enqid}' `;

	pool.query(query, function (err, data) {
		if (err) {
			return handleError(new ErrorHandler('500', `/update-customer/:id/:enqid ${id} ${enqid}`, err), res);
		} else {
			res.json({
				result: 'success',
			});
		}
	});
});

// todo, can be deleted, check and delete
enquiryRoute.post('/update-status-enquiry-details', (req, res) => {
	let status = req.body.status;
	let id = req.body.enqdetailid;

	if (status === 'B') {
		let query = `update enquiry_detail
		set
		product_id = null,
		status = '${status}'
		where id = '${id}' `;

		pool.query(query, function (err, data) {
			if (err) {
				return handleError(new ErrorHandler('500', `/update-status-enquiry-details ${status} ${id}`, err), res);
			} else {
			}
		});
	}
});

enquiryRoute.post('/update-enquiry-details', (req, res) => {
	let jsonObj = req.body;

	var objectKeysArray = Object.keys(jsonObj);
	objectKeysArray.forEach(function (objKey) {
		var objValue = jsonObj[objKey];
	});
});

enquiryRoute.post('/insert-enquiry-details', (req, res) => {
	let jsonObj = req.body;

	var today = new Date();
	let count = 0;

	today = currentTimeInTimeZone('Asia/Kolkata', 'YYYY-MM-DD HH:mm:ss');

	let query = `INSERT INTO enquiry ( center_id, customer_id, enquiry_date, estatus, remarks) 
							values ( '${jsonObj.center_id}', '${jsonObj.customerctrl.id}', '${today}', 'O','${jsonObj.remarks}')`;

	pool.query(query, async function (err, data) {
		if (err) {
			return handleError(new ErrorHandler('500', 'error /insert-enquiry-details insert enquiry..step1..', err), res);
		} else {
			let tmpid = data.insertId;

			const prodArr = jsonObj['productarr'];

			for (const k of prodArr) {
				await insertEnquiryDetail(k, jsonObj, tmpid, (err, data) => {
					if (err) {
						let errTxt = err.message;

						return handleError(new ErrorHandler('500', '/insert-enquiry-details', err), res);
					} else {
						let newPK = data.insertId;
						// do nothing...
					}
				});

				count++;
				if (count === prodArr.length) {
					res.json({
						result: 'success',
					});
				}
			}
		}
	});
});
// askqty: 2
// center_id: 2
// enquiry_id: "115"
// notes: "Kit- O Ring For Response Valve"
// product_code: "P000302"
// status: "O"
enquiryRoute.post('/add-more-enquiry-details', (req, res) => {
	let jsonObj = req.body;

	var today = new Date();

	today = currentTimeInTimeZone('Asia/Kolkata', 'YYYY-MM-DD HH:mm:ss');

	let query1 = `INSERT INTO enquiry_detail ( enquiry_id, product_id, askqty, product_code, notes, status)
							values ( '${jsonObj.enquiry_id}', 
							(select id from product where product_code='${jsonObj.product_code}' 
							and center_id = '${jsonObj.center_id}'), 
							'${jsonObj.askqty}', '${jsonObj.product_code}', '${jsonObj.notes}', 'O')`;

	pool.query(query1, function (err, data) {
		if (err) {
			return handleError(new ErrorHandler('500', '/add-more-enquiry-details', err), res);
		} else {
			res.json({
				result: data.insertId,
			});
		}
	});
});

enquiryRoute.get('/open-enquiries/:centerid/:status', (req, res) => {
	let centerid = req.params.centerid;
	let status = req.params.status;

	let sql = `select e.id, e.enquiry_date, e.estatus, c.name as custname,
  
	(select count(*) from enquiry_detail where enquiry_id = e.id)
	as noofitems
	from enquiry e, customer c
	where 
		e.customer_id = c.id and
	estatus = '${status}' and e.center_id = '${centerid}'
	order by 
	enquiry_date desc`;

	pool.query(sql, function (err, data) {
		if (err) {
			return handleError(new ErrorHandler('500', `/open-enquiries/:centerid/:status ${centerid} ${status}`, err), res);
		} else {
			return res.json(data);
		}
	});
});

enquiryRoute.get('/get-enquiry-details/:enqid', async (req, res) => {
	let enqid = req.params.enqid;

	let enquiryDetails;
	let customerDetails;

	await fetchEnquiryDetailByEnqId(enqid, (err, data) => {
		if (err) {
			let errTxt = err.message;

			return handleError(new ErrorHandler('500', `/get-enquiry-details/:enqid ${enqid}`, err), res);
		} else {
			enquiryDetails = data;
			// do nothing...
		}
	});

	await fetchCustomerDetailsByEnqId(enqid, (err, data) => {
		if (err) {
			let errTxt = err.message;

			return handleError(new ErrorHandler('500', `/get-enquiry-details/:enqid ${enqid} fetchCustomerDetailsByEnqId .`, err), res);
		} else {
			customerDetails = data;
			// do nothing...
		}
	});

	return res.json({
		enquiryDetails: enquiryDetails,
		customerDetails: customerDetails,
	});
});

enquiryRoute.get('/get-enquiry-master/:enqid', (req, res) => {
	let enqid = req.params.enqid;

	let sql = `
	select 
	e.id as enqid,
	e.enquiry_date as enquiry_date,
	e.estatus as estatus,
	e.sale_id as sale_id,
	e.processed_date as processed_date,
	c.id as customer_id,
	 c.name as customer_name,
	 c.address1 as address1,
	 c.address2 as address2,
	 c.address3 as address3,
	 c.gst as gst,
	 c.mobile as mobile,
	 c.credit_amt,
	 csa.address1 as csa_address1,
	 csa.address2 as csa_address2
	from enquiry e,
	customer c,
	customer_shipping_address csa
	where 
	c.id = e.customer_id and
	csa.customer_id = c.id and
	e.id = ${enqid}	

	`;

	pool.query(sql, function (err, data) {
		if (err) {
			return handleError(new ErrorHandler('500', `/get-enquiry-master/:enqid ${enqid}`, err), res);
		} else {
			return res.json(data);
		}
	});
});

enquiryRoute.get('/get-customer-data/:enqid', (req, res) => {
	let enqid = req.params.enqid;

	let sql = `select c.*, s.code 
	from
	customer c,
	enquiry e,
	state s
	where
	e.customer_id = c.id and
	s.id = c.state_id and
	e.id = ${enqid}
	`;

	pool.query(sql, function (err, data) {
		if (err) {
			return handleError(new ErrorHandler('500', `/get-customer-data/:enqid ${enqid}`, err), res);
		} else {
			return res.json(data);
		}
	});
});

enquiryRoute.get('/get-enquired-product-data/:centerid/:customerid/:enqid/:invdt', (req, res) => {
	let centerid = req.params.centerid;
	let customerid = req.params.customerid;
	let enqid = req.params.enqid;
	let orderdate = req.params.invdt;

	// fetch values only of enq detail status in {P - processed, F - fullfilled} B- backorder is ignored
	let sql = `select a.product_code as product_code, a.description, a.mrp, a.taxrate, b.available_stock,
	ed.giveqty as qty, a.unit_price, a.id as product_id, b.id as stock_pk, e.enquiry_date,
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
	
	) as disc_info
	
	
	from 
	enquiry e,
	enquiry_detail ed,
	product a, 
	stock b
	where
	e.id = ed.enquiry_id and
	ed.product_id = a.id and
	a.id = b.product_id and
	b.id = ed.stock_id and
	ed.status in ('P', 'F')  and
	ed.giveqty != 0 and
	e.id = ${enqid}
	`;

	pool.query(sql, function (err, data) {
		if (err) {
			return handleError(
				new ErrorHandler('500', `/get-enquired-product-data/:centerid/:customerid/:enqid/:invdt ${centerid} ${customerid} ${enqid} ${invdt}`, err),
				res,
			);
		} else {
			return res.json(data);
		}
	});
});

enquiryRoute.get('/back-order/:centerid', (req, res) => {
	let centerid = req.params.centerid;

	let sql = `SELECT c.name as customer_name, p.product_code as product_code, p.id as product_id,
	p.description as description, ed.notes, ed.askqty, ed.giveqty, b.reason, b.order_date, s.available_stock
	FROM 
	backorder b, 
	enquiry_detail ed,
	product p,
	stock s, customer c
	WHERE 
	s.product_id = p.id and c.id = b.customer_id and
	b.enquiry_detail_id = ed.id and
	p.id = ed.product_id and
	str_to_date(order_date, '%d-%m-%YYYY') BETWEEN DATE_SUB(NOW(), INTERVAL 30 DAY) AND NOW()
	union all
	SELECT c.name as customer_name, "N/A" as product_code, "N/A" as product_id, "N/A" as description, ed.notes, ed.askqty, ed.giveqty, b.reason, 
	b.order_date, "N/A" as available_stock FROM 
	backorder b, customer c,
	enquiry_detail ed
	WHERE 
	b.enquiry_detail_id = ed.id and
	c.id = b.customer_id and
	ed.product_id is null and
	str_to_date(order_date, '%d-%m-%YYYY') BETWEEN DATE_SUB(NOW(), INTERVAL 30 DAY) AND NOW();
	`;

	pool.query(sql, function (err, data) {
		if (err) {
			return handleError(new ErrorHandler('500', `/back-order/:centerid ${centerid}`, err), res);
		} else {
			return res.json(data);
		}
	});
});

enquiryRoute.post('/search-enquiries', (req, res) => {
	let center_id = req.body.centerid;
	let status = req.body.status;
	let customer_id = req.body.customerid;
	let from_date = req.body.fromdate;
	let to_date = req.body.todate;
	let order = req.body.order;

	if (from_date !== '') {
		from_date = toTimeZone(req.body.fromdate, 'Asia/Kolkata');
	}

	if (to_date !== '') {
		to_date = toTimeZone(req.body.todate, 'Asia/Kolkata');
	}

	let custsql = `and e.customer_id = '${customer_id}' `;

	let sql = `select
	e.id as id,
	e.center_id as center_id,
	e.customer_id as customer_id,
	CAST(e.enquiry_date AS CHAR) as enquiry_date,
	e.estatus as estatus,
	e.remarks as remarks,
	e.sale_id as sale_id,
	e.processed_date as processed_date,
	c.id as customer_id, c.name as customer_name,
    	case e.estatus
				when 'O' then 'New'
				when 'D' then 'Draft'
				when 'E' then 'Executed'
				when 'P' then 'Invoice Ready'
				when 'C' then 'Completed'
				when 'X' then 'Cancelled'
    end as status_txt,
	(select count(*) from enquiry_detail where enquiry_id = e.id)
	as noofitems
	from
	enquiry e,
	customer c
	where
	c.id = e.customer_id and

	e.center_id =  '${center_id}' and
	str_to_date(DATE_FORMAT(enquiry_date,'%d-%m-%YYYY') , '%d-%m-%YYYY') between
	str_to_date('${from_date}', '%d-%m-%YYYY') and
	str_to_date('${to_date}', '%d-%m-%YYYY')  `;

	if (customer_id !== 'all') {
		sql = sql + custsql;
	}

	if (status !== 'all') {
		sql = sql + ` and e.estatus =  '${status}' `;
	}

	sql = sql + `order by enquiry_date ${order} `;

	pool.query(sql, function (err, data) {
		if (err) {
			return handleError(new ErrorHandler('500', '/search-enquiries', err), res);
		} else {
			return res.json(data);
		}
	});
});

//**** START */

enquiryRoute.post('/delete-enquiry-details', async (req, res) => {
	let id = req.body.id;
	let enq_id = req.body.enquiry_id;

	let today = currentTimeInTimeZone('Asia/Kolkata', 'YYYY-MM-DD HH:mm:ss');

	// step 1
	let auditQuery = `
	INSERT INTO audit_tbl (module, module_ref_id, module_ref_det_id, actn, old_value, new_value, audit_date, center_id)
	VALUES
		('Enquiry', '${enq_id}', '${id}', 'delete', 
		(SELECT CONCAT('[{', result, '}]') as final
		FROM (
			SELECT GROUP_CONCAT(CONCAT_WS(',', CONCAT('"saleId": ', enquiry_id), CONCAT('"productId": "', product_id, '"'), CONCAT('"askqty": "', askqty, '"')) SEPARATOR '},{') as result
			FROM (
				SELECT enquiry_id, product_id, askqty, notes
				FROM enquiry_detail where id = '${id}'
			) t1
		) t2)
		, '', '${today}', (select center_id from enquiry where id = '${enq_id}')
		) `;

	// step 1
	let auditPromise = await new Promise(function (resolve, reject) {
		pool.query(auditQuery, function (err, data) {
			if (err) {
				return reject(handleError(new ErrorHandler('500', '/delete-enquiry-details', err), res));
			}
			resolve(data);
		});
	});

	// step 2
	let deletePromise = await new Promise(function (resolve, reject) {
		let query = `
			delete from enquiry_detail where id = '${id}' `;

		pool.query(query, function (err, data) {
			if (err) {
				return reject(handleError(new ErrorHandler('500', '/delete-enquiry-details', err), res));
			}
			resolve(data);
		});
	});

	return res.json({
		result: 'success',
	});
});

/** END */

module.exports = enquiryRoute;
