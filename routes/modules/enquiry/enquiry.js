var pool = require('../../helpers/db');
const moment = require('moment');
const logger = require('./../../helpers/log4js');

const { handleError, ErrorHandler } = require('./../../helpers/error');

const { toTimeZone, currentTimeInTimeZone } = require('./../../helpers/utils');

const insertEnquiryDetail = (k, jsonObj, tmpid, callback) => {
	let today = currentTimeInTimeZone('Asia/Kolkata', 'YYYY-MM-DD HH:mm:ss');

	let query = `INSERT INTO enquiry_detail ( enquiry_id, product_id, askqty, product_code, notes, status)
        values ( '${tmpid}', (select id from product where product_code='${k.product_code}' and center_id = '${jsonObj.center_id}'), '${k.quantity}', '${k.product_code}', '${k.notes}', 'O')`;

	return new Promise(function (resolve, reject) {
		pool.query(query, function (err, data) {
			if (err) {
				return reject(callback(err));
			}
			return resolve(callback(null, data));
		});
	});
};

const fetchEnquiryDetailByEnqId = (enqid, callback) => {
	let today = currentTimeInTimeZone('Asia/Kolkata', 'YYYY-MM-DD HH:mm:ss');

	let query = `
	select orig.*, s.available_stock, s.id as stock_pk
from
(select ed.*, c.id as customer_id, c.name, c.address1, c.address2, c.district, c.pin, c.gst, c.mobile2, e.remarks, e.estatus,
	p.id as pid, p.center_id, p.brand_id, p.product_code as pcode, p.description as pdesc, p.unit, p.packetsize, p.hsncode,
	p.currentstock, p.unit_price, p.mrp, p.purchase_price,
	p.salesprice, p.rackno, p.location, p.maxdiscount, p.taxrate, 
	p.minqty, p.itemdiscount, p.reorderqty, p.avgpurprice,
	p.avgsaleprice, p.margin
	from 
	enquiry e,
	customer c,
	enquiry_detail ed
	LEFT outer JOIN product p
	ON p.id = ed.product_id where
	e.id = ed.enquiry_id and
	e.customer_id = c.id and e.id =  ${enqid}) as orig
	LEFT outer JOIN stock s
	ON orig.product_id = s.product_id and
	s.mrp = orig.mrp
	`;

	return new Promise(function (resolve, reject) {
		pool.query(query, function (err, data) {
			if (err) {
				return reject(callback(err));
			}
			return resolve(callback(null, data));
		});
	});
};

const fetchCustomerDetailsByEnqId = (enqid, callback) => {
	let today = currentTimeInTimeZone('Asia/Kolkata', 'YYYY-MM-DD HH:mm:ss');

	let query = `
	select c.*, e.* from 
enquiry e,
customer c
where
c.id = e.customer_id and
e.id = ${enqid}
	`;

	return new Promise(function (resolve, reject) {
		pool.query(query, function (err, data) {
			if (err) {
				return reject(callback(err));
			}
			return resolve(callback(null, data));
		});
	});
};

const updateEnquiry = (status, enqId, updatedby, res) => {
	let today = currentTimeInTimeZone('Asia/Kolkata', 'YYYY-MM-DD HH:mm:ss');

	let query = `update enquiry 
			set
				estatus = '${status}',
				processed_date = '${today}',
				updatedby = '${updatedby}',
				updateddate = '${today}'

			where
				id = '${enqId}' `;

	return new Promise(function (resolve, reject) {
		pool.query(query, function (err, data) {
			if (err) {
				return handleError(new ErrorHandler('500', `Error updateEnquiry QUERY: ${query}`, err), res);
			}
			return resolve('success');
		});
	});
};

const updateEnquiryDetail = (product_id, stock_id, allotedQty, processed, status, enquiry_detail_id, updatedby, res) => {
	let today = currentTimeInTimeZone('Asia/Kolkata', 'YYYY-MM-DD HH:mm:ss');

	let query = `update enquiry_detail `;

	if (product_id !== '') {
		query =
			query +
			`
		set
			product_id = '${product_id}',
			stock_id = '${stock_id}',
			giveqty = '${allotedQty}',
			processed = '${processed}',
			status = '${status}', 
			updatedby = '${updatedby}',
			updateddate = '${today}'
			`;
	} else {
		query =
			query +
			`
		set
			giveqty = '${allotedQty}',
			status = '${status}',
			updatedby = '${updatedby}',
			updateddate = '${today}'
			`;
	}

	query =
		query +
		`
		where
		id = '${enquiry_detail_id}' `;

	return new Promise(function (resolve, reject) {
		pool.query(query, function (err, data) {
			if (err) {
				return handleError(new ErrorHandler('500', `Error updateEnquiryDetail QUERY: ${query}`, err), res);
			}
			return resolve('success');
		});
	});
};

const insertBackOrder = (center_id, customer_id, enquiry_detail_id, askQty, reason, status, createdby, res) => {
	let today = currentTimeInTimeZone('Asia/Kolkata', 'YYYY-MM-DD HH:mm:ss');
	let now = currentTimeInTimeZone('Asia/Kolkata', 'DD-MM-YYYY');

	let query = `
		insert into
			backorder (center_id, customer_id, enquiry_detail_id, qty, reason, status, order_date, createdby, createddate)
		VALUES ('${center_id}', '${customer_id}', '${enquiry_detail_id}', '${askQty}', '${reason}', '${status}', '${now}', '${createdby}', '${today}') 
	`;

	return new Promise(function (resolve, reject) {
		pool.query(query, function (err, data) {
			if (err) {
				return handleError(new ErrorHandler('500', `Error insertBackOrder ${query} `, err), res);
			}
			return resolve('success');
		});
	});
};

const getSuccessfullyProcessedItems = (enquiry_id, res) => {
	let query = `
	select
		count(*) as count
	from 
		enquiry_detail e
	where
		enquiry_id = '${enquiry_id}' and
		e.status in ('P', 'F')`;

	return new Promise(function (resolve, reject) {
		pool.query(query, function (err, data) {
			if (err) {
				return handleError(new ErrorHandler('500', `Error getSuccessfullyProcessedItems ${query} `, err), res);
			}
			resolve(data[0].count);
		});
	});
};

module.exports = {
	insertEnquiryDetail,
	fetchCustomerDetailsByEnqId,
	fetchEnquiryDetailByEnqId,
	updateEnquiryDetail,
	insertBackOrder,
	updateEnquiry,
	getSuccessfullyProcessedItems,
};
