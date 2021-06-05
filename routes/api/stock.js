const express = require('express');
const stockRouter = express.Router();
const logger = require('../../routes/helpers/log4js');
const { toTimeZone, currentTimeInTimeZone } = require('./../helpers/utils');

const { handleError, ErrorHandler } = require('./../helpers/error');

const mysql = require('mysql');
const moment = require('moment');

var pool = require('./../helpers/db');

const { getSalesMaster, getSalesDetails } = require('../modules/sales/sales.js');

const { insertItemHistoryTable, updateStockViaId } = require('../modules/stock/stock.js');

stockRouter.get('/search-all-draft-purchase/:centerid', (req, res) => {
	let center_id = req.params.centerid;

	let sql = `select p.*, v.id as vendor_id, v.name as vendor_name,
	case p.status
        when 'D' then 'Draft'
        when 'C' then 'Completed'
    end as pstatus
	from
	purchase p,
	vendor v
	where
	v.id = p.vendor_id and
	p.status = 'D' and 
	p.center_id = '${center_id}' `;

	pool.query(sql, function (err, data) {
		if (err) {
			return handleError(new ErrorHandler('500', `/search-all-draft-purchase/:centerid ${center_id}`, err), res);
		} else {
			return res.json(data);
		}
	});
});

// str_to_date(stock_inwards_datetime, '%Y-%m-%d %T') between
// str_to_date('2020-05-01 00:00:00', '%Y-%m-%d %T') and
// str_to_date('2020-05-08 23:59:00', '%Y-%m-%d %T')

stockRouter.post('/search-purchase', (req, res) => {
	let center_id = req.body.centerid;
	let status = req.body.status;
	let vendor_id = req.body.vendorid;
	let from_date = req.body.fromdate;
	let to_date = req.body.todate;
	let order = req.body.order;

	if (from_date !== '') {
		from_date = toTimeZone(req.body.fromdate, 'Asia/Kolkata') + ' 00:00:00';
	}

	if (to_date !== '') {
		to_date = toTimeZone(req.body.todate, 'Asia/Kolkata') + ' 23:59:00';
	}

	let vendsql = `and p.vendor_id = '${vendor_id}' `;
	let statussql = `and p.status = '${status}' `;

	let sql = `select p.*, v.id as vendor_id, v.name as vendor_name
	from
	purchase p,
	vendor v
	where
	v.id = p.vendor_id and
	
	p.center_id = '${center_id}' and
	str_to_date(received_date,  '%d-%m-%Y %T') between
	str_to_date('${from_date}',  '%d-%m-%Y %T') and
	str_to_date('${to_date}',  '%d-%m-%Y %T') `;

	if (vendor_id !== 'all') {
		sql = sql + vendsql;
	}

	if (status !== 'all') {
		sql = sql + statussql;
	}

	sql = sql + `order by received_date ${order}`;

	pool.query(sql, function (err, data) {
		if (err) {
			return handleError(new ErrorHandler('500', '/search-purchase', err), res);
		} else {
			return res.json(data);
		}
	});
});

stockRouter.post('/search-sales', (req, res) => {
	let center_id = req.body.centerid;
	let status = req.body.status;
	let customer_id = req.body.customerid;
	let from_date = req.body.fromdate;
	let to_date = req.body.todate;
	let sale_type = req.body.saletype;
	let search_type = req.body.searchtype;
	let invoice_no = req.body.invoiceno;
	let order = req.body.order;

	let sql = '';
	let query = '';

	if (search_type === 'all') {
		if (from_date !== '') {
			from_date = toTimeZone(req.body.fromdate, 'Asia/Kolkata') + ' 00:00:00';
		}

		if (to_date !== '') {
			to_date = toTimeZone(req.body.todate, 'Asia/Kolkata') + ' 23:59:00';
		}

		let custsql = `and s.customer_id = '${customer_id}' `;
		let statussql = `and s.status = '${status}' `;

		sql = `select s.*, c.id as customer_id, c.name as customer_name
        from
        sale s,
        customer c
        where
        c.id = s.customer_id and
        
				s.center_id = '${center_id}' and
				
				str_to_date(invoice_date,  '%d-%m-%Y %T') between
				str_to_date('${from_date}',  '%d-%m-%Y %T') and
				str_to_date('${to_date}',  '%d-%m-%Y %T') `;

		if (customer_id !== 'all') {
			sql = sql + custsql;
		}

		if (status !== 'all') {
			sql = sql + statussql;
		}

		if (sale_type !== 'all') {
			if (sale_type === 'GI') {
				sql = sql + " and s.sale_type = 'gstinvoice' ";
			} else if (sale_type === 'SI') {
				sql = sql + " and s.sale_type = 'stockissue' ";
			}
		}

		if (invoice_no.trim().length > 0) {
			sql = sql + `and invoice_no = '${invoice_no.trim()}' `;
		}

		sql = sql + ' order by invoice_no ' + order;
	} else if (search_type !== 'all') {
		query = ` 
		select s.*, c.id as customer_id, c.name as customer_name
					from
					sale s,
					customer c
					where
					c.id = s.customer_id and
					
					s.center_id = '${center_id}' and
					invoice_no = '${invoice_no.trim()}'
					
		`;
	}

	pool.query(search_type === 'all' ? sql : query, function (err, data) {
		if (err) {
			return handleError(new ErrorHandler('500', 'Error fetching search sales', err), res);
		} else {
			return res.json(data);
		}
	});
});

stockRouter.get('/purchase-master/:id', (req, res) => {
	let purchase_id = req.params.id;

	let sql = `
	select p.*
from 
purchase p
where
p.id = '${purchase_id}' `;

	pool.query(sql, function (err, data) {
		if (err) {
			return handleError(new ErrorHandler('500', `/purchase-master/:id ${purchase_id}`, err), res);
		} else {
			return res.json(data);
		}
	});
});

// get sale master records
stockRouter.get('/sales-master/:id', async (req, res) => {
	// @from Sales file

	let rows = await getSalesMaster(`${req.params.id}`);
	return res.json(rows);

	// getSalesMaster(`${req.params.id}`, (err, rows) => {
	// 	if (err) return handleError(new ErrorHandler("500", "Error fetching sales master"), res);
	// 	return res.json(rows);
	// });
});

// get sale details records
stockRouter.get('/sale-details/:id', async (req, res) => {
	let rows = await getSalesDetails(`${req.params.id}`);

	return res.json(rows);
});

stockRouter.post('/delete-sale-details', (req, res) => {
	let id = req.body.id;

	let query = `
	delete from sale_detail where id = '${id}' `;

	pool.query(query, function (err, data) {
		if (err) {
			return handleError(new ErrorHandler('500', '/delete-sale-details', err), res);
		} else {
			return res.json({
				result: 'success',
			});
		}
	});
});

stockRouter.get('/delete-item-history/:saleid', (req, res) => {
	let sale_id = req.params.saleid;

	let query = `
	delete from item_history where sale_id = '${sale_id}' `;

	pool.query(query, function (err, data) {
		if (err) {
			return handleError(new ErrorHandler('500', '/delete-item-history', err), res);
		} else {
			return res.json({
				result: 'success',
			});
		}
	});
});

stockRouter.get('/purchase-details/:id', (req, res) => {
	let purchase_id = req.params.id;

	let sql = `
	select pd.*, 
pd.id as id, 
pd.purchase_id as purchase_id,
pd.product_id as product_id,
pd.qty as qty,
pd.purchase_price as purchase_price,
pd.mrp as mrp,
pd.batchdate as batchdate,
pd.tax as tax,
pd.igst as igst,
pd.cgst as cgst,
pd.sgst as sgst,
pd.taxable_value as tax_value,
pd.total_value as total_value,
ps.revision as revision,
p.product_code, p.description, p.packetsize, p.taxrate,
s.id as stock_pk, p.hsncode as hsncode from
purchase_detail pd,
product p,
stock s,
purchase ps
where
ps.id = pd.purchase_id and
s.product_id = p.id and
p.id = pd.product_id and
s.id = pd.stock_id and
pd.purchase_id = '${purchase_id}' 
	 `;

	pool.query(sql, function (err, data) {
		if (err) {
			return handleError(new ErrorHandler('500', `/purchase-details/:id ${purchase_id}`, err), res);
		} else {
			return res.json(data);
		}
	});
});

stockRouter.post('/delete-purchase-details', async (req, res) => {
	let center_id = req.body.center_id;
	let id = req.body.id;
	let purchase_id = req.body.purchaseid;
	let qty = req.body.qty;
	let product_id = req.body.product_id;
	let stock_id = req.body.stock_id;
	let mrp = req.body.mrp;

	let today = currentTimeInTimeZone('Asia/Kolkata', 'YYYY-MM-DD HH:mm:ss');

	let auditQuery = `
	INSERT INTO audit_tbl (module, module_ref_id, module_ref_det_id, actn, old_value, new_value, audit_date, center_id)
	VALUES
		('Purchase', '${purchase_id}', '${id}', 'delete', 
		(SELECT CONCAT('[{', result, '}]') as final
		FROM (
			SELECT GROUP_CONCAT(CONCAT_WS(',', CONCAT('"purchaseId": ', purchase_id), CONCAT('"productId": "', product_id, '"'), CONCAT('"qty": "', qty, '"')) SEPARATOR '},{') as result
			FROM (
				SELECT purchase_id, product_id, qty
				FROM purchase_detail where id = '${id}'
			) t1
		) t2)
		, '', '${today}', '${center_id}'
		) `;

	// step 1
	let auditPromise = await new Promise(function (resolve, reject) {
		pool.query(auditQuery, function (err, data) {
			if (err) {
				return reject(handleError(new ErrorHandler('500', '/delete-purchase-details', err), res));
			}
			resolve(data);
		});
	});

	// step 2
	let deletePromise = await new Promise(function (resolve, reject) {
		let query = `
			delete from purchase_detail where id = '${id}' `;

		pool.query(query, function (err, data) {
			if (err) {
				return reject(handleError(new ErrorHandler('500', 'Error deleting purchase_detail ', err), res));
			}
			resolve(data);
		});
	});

	//

	// step 3
	let stockUpdatePromise = await updateStockViaId(qty, product_id, stock_id, 'minus', res);

	// step 4 , reverse item history table entries.

	let itemHistory = await insertItemHistoryTable(
		center_id,
		'Purchase',
		product_id,
		purchase_id,
		id, //purchase_det_id
		'0', // sale_id
		'0', //sale_det_id
		'PUR',
		'Mod/Del',
		qty, //txn_qty
		res,
	);

	return res.json({
		result: 'success',
	});
});

module.exports = stockRouter;

// called from sale details list delete
stockRouter.delete('/delete-purchase/:id', async (req, res) => {
	let purchase_id = req.params.id;

	let purchaseDetails = await getPurchaseDetails(purchase_id);

	let idx = 0;

	let retValue = await deletePurchaseDetailsRecs(purchaseDetails, purchase_id);

	if (retValue === 'done') {
		return res.json({
			result: 'success',
		});
	}
});

function getPurchaseDetails(purchase_id) {
	let sql = `
	select pd.*, 
pd.id as id, 
pd.purchase_id as purchase_id,
pd.product_id as product_id,
pd.qty as qty,
pd.purchase_price as purchase_price,
pd.mrp as mrp,
pd.batchdate as batchdate,
pd.tax as tax,
pd.igst as igst,
pd.cgst as cgst,
pd.sgst as sgst,
pd.taxable_value as tax_value,
pd.total_value as total_value,
p.product_code, p.description, p.packetsize, p.taxrate from 
purchase_detail pd,
product p
where
p.id = pd.product_id and
pd.purchase_id = '${purchase_id}' 
	 `;

	return new Promise(function (resolve, reject) {
		pool.query(sql, function (err, data) {
			if (err) {
				reject(err);
			}
			resolve(data);
		});
	});
}

function deletePurchaseDetailsRecs(purchaseDetails, purchase_id) {
	let idx = 0;

	purchaseDetails.forEach(async (element, index) => {
		idx = index + 1;
		let today = currentTimeInTimeZone('Asia/Kolkata', 'YYYY-MM-DD HH:mm:ss');

		let auditQuery = `
		INSERT INTO audit_tbl (module, module_ref_id, module_ref_det_id, actn, old_value, new_value, audit_date, center_id)
		VALUES
			('Purchase', '${purchase_id}', '${element.id}', 'delete', 
			(SELECT CONCAT('[{', result, '}]') as final
			FROM (
				SELECT GROUP_CONCAT(CONCAT_WS(',', CONCAT('"purchaseId": ', purchase_id), CONCAT('"productId": "', product_id, '"'), CONCAT('"qty": "', qty, '"')) SEPARATOR '},{') as result
				FROM (
					SELECT purchase_id, product_id, qty
					FROM purchase_detail where id = '${element.id}'
				) t1
			) t2)
			, '', '${today}', (select center_id from sale where id = '${sale_id}')
			) `;

		// step 1
		let auditPromise = await new Promise(function (resolve, reject) {
			pool.query(auditQuery, function (err, data) {
				if (err) {
					return reject(handleError(new ErrorHandler('500', 'Error adding sale audit. deletePurchaseDetailsRecs', err), res));
				}
				resolve(data);
			});
		});

		// step 2
		let deletePromise = await new Promise(function (resolve, reject) {
			let query = `
				delete from purchase_detail where id = '${element.id}' `;

			pool.query(query, function (err, data) {
				if (err) {
					return reject(handleError(new ErrorHandler('500', 'Error deleting purchase_detail ', err), res));
				}
				resolve(data);
			});
		});

		//

		// step 3
		let stockUpdatePromise = await updateStockViaId(element.qty, element.product_id, element.stock_id, 'minus', res);
	});

	if (purchaseDetails.length === idx) {
		return new Promise(function (resolve, reject) {
			resolve('done');
		}).catch(() => {
			/* do whatever you want here */
		});
	}
}

stockRouter.get('/delete-purchase-master/:id', async (req, res) => {
	let purchase_id = req.params.id;

	let sql = `
		delete from purchase where 
	id = '${purchase_id}' `;

	pool.query(sql, function (err, data) {
		if (err) {
			return handleError(new ErrorHandler('500', `/delete-purchase-master/:id ${purchase_id}`, err), res);
		} else {
			return res.json({
				result: 'success',
			});
		}
	});
});
