var pool = require("../../helpers/db");
const moment = require("moment");
const logger = require("./../../helpers/log4js");

const insertEnquiryDetail = (k, jsonObj, tmpid, callback) => {
	var today = new Date();
	today = moment(today).format("YYYY-MM-DD HH:mm:ss");

	// let query = `  INSERT INTO brand (center_id, name, createdon, isactive ) VALUES (?, ?, '${today}', 'A')`;

	logger.debug.debug(" CHECK ORDER OR ARRAY LOOPING ...xx..." + k.notes);
	let query = `INSERT INTO enquiry_detail ( enquiry_id, product_id, askqty, product_code, notes, status)
        values ( '${tmpid}', (select id from product where product_code='${k.product_code}' and center_id = '${jsonObj.center_id}'), '${k.quantity}', '${k.product_code}', '${k.notes}', 'O')`;

	return new Promise(function (resolve, reject) {
		pool.query(query, function (err, data) {
			if (err) {
				logger.debug.debug("insert enquiry callback " + JSON.stringify(err));
				return reject(callback(err));
			}
			return resolve(callback(null, data));
		});
	});
};

const fetchEnquiryDetailByEnqId = (enqid, callback) => {
	var today = new Date();
	today = moment(today).format("YYYY-MM-DD HH:mm:ss");

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
				logger.debug.debug("insert enquiry callback " + JSON.stringify(err));
				return reject(callback(err));
			}
			return resolve(callback(null, data));
		});
	});
};

const fetchCustomerDetailsByEnqId = (enqid, callback) => {
	var today = new Date();
	today = moment(today).format("YYYY-MM-DD HH:mm:ss");

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

module.exports = {
	insertEnquiryDetail,
	fetchCustomerDetailsByEnqId,
	fetchEnquiryDetailByEnqId,
};
