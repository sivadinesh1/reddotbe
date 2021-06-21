var pool = require('../../helpers/db');
const logger = require('./../../helpers/log4js');
const { toTimeZone, currentTimeInTimeZone, toTimeZoneFrmt } = require('./../../helpers/utils');

const { insertItemHistoryTable } = require('./../../modules/stock/stock.js');

const getSalesMaster = (sales_id, callback) => {
	let sql = `select s.*, c.name, c.address1, c.address2, c.district 
	from sale s,
	customer c where s.customer_id = c.id and s.id = '${sales_id}' `;

	return new Promise(function (resolve, reject) {
		pool.query(sql, function (err, data) {
			if (err) {
				reject(err);
			}
			resolve(data);
		});
	});
};

function getSalesDetails(sales_id) {
	let sql = ` select sd.*, sd.id as id, sd.sale_id as sale_id,
							sd.product_id as product_id, sd.qty as qty,sd.unit_price as unit_price,
							sd.mrp as mrp, sd.batchdate as batchdate, sd.tax as tax, sd.igst as igst,
							sd.cgst as cgst, sd.sgst as sgst, sd.taxable_value as tax_value,
							sd.total_value as total_value, p.product_code, p.description, p.packetsize, p.taxrate,
							p.hsncode, p.unit,
							s.id as stock_pk, s.mrp as stock_mrp, s.available_stock as stock_available_stock
							from 
							sale_detail sd, product p, stock s
							where
							p.id = sd.product_id and s.product_id = p.id and
							s.id = sd.stock_id and sd.sale_id = '${sales_id}' `;

	return new Promise(function (resolve, reject) {
		pool.query(sql, function (err, data) {
			if (err) {
				reject(err);
			}
			resolve(data);
		});
	});
}

const insertSaleDetails = (k, callback) => {
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

const IUSaleDetailsAsync = (k) => {
	let insQuery100 = `INSERT INTO sale_detail(sale_id, product_id, qty, disc_percent, disc_value, disc_type, unit_price, mrp, batchdate, tax,
		igst, cgst, sgst, taxable_value, total_value, stock_id) VALUES
		( '${newPK}', '${k.product_id}', '${k.qty}', '${k.disc_percent}', '${k.disc_value}', '${k.disc_type}', '${
		(k.total_value - k.disc_value) / k.qty
	}', '${k.mrp}', 
	
		'${currentTimeInTimeZone('Asia/Kolkata', 'DD-MM-YYYY')}',
		'${k.taxrate}', '${k.igst}', 
		'${k.cgst}', '${k.sgst}', '${k.taxable_value}', '${k.total_value}', '${k.stock_pk}')`;

	let upQuery100 = `update sale_detail set product_id = '${k.product_id}', qty = '${k.qty}', disc_percent = '${k.disc_percent}', 
disc_value = '${k.disc_value}',	disc_type= '${k.disc_type}', unit_price = '${(k.total_value - k.disc_value) / k.qty}', mrp = '${k.mrp}', 
		batchdate = '${currentTimeInTimeZone('Asia/Kolkata', 'DD-MM-YYYY')}', tax = '${k.taxrate}',
		igst = '${k.igst}', cgst = '${k.cgst}', sgst = '${k.sgst}', 
		taxable_value = '${k.taxable_value}', total_value = '${k.total_value}', stock_id = '${k.stock_pk}'
		where
		id = '${k.sale_det_id}' `;

	return new Promise(function (resolve, reject) {
		pool.query(k.sale_det_id === '' ? insQuery100 : upQuery100, function (err, data) {
			if (err) {
				reject(err);
			}
			resolve(data);
		});
	});
};

const updateProductAsync = (k) => {
	// query is wrong - if this transaction need rewrite query
	let query = ` update product set currentstock = (select sum(available_stock) 
								from stock where product_id = '${k.product_id}' ) where id = '${k.product_id}' `;

	return new Promise(function (resolve, reject) {
		pool.query(query, function (err, data) {
			if (err) {
				reject(err);
			}
			resolve(data);
		});
	});
};

const insertItemHistoryAsync = async (k, vSale_id, vSale_det_id, cloneReq, res) => {
	// to avoid duplicate entry of history items when editing completed records
	// with same qty. (status = 'c'). If status=C & k.qty - k.old_val !== 0 then updatehistorytable
	let skipHistoryUpdate = false;
	var today = new Date();

	today = currentTimeInTimeZone('Asia/Kolkata', 'DD-MM-YYYY HH:mm:ss');

	// if sale details id is missing its new else update
	let sale_det_id = k.sale_det_id === '' ? vSale_det_id : k.sale_det_id;
	let txn_qty = k.sale_det_id === '' ? k.qty : k.qty - k.old_val;
	let actn_type = 'Sold';
	let sale_id = vSale_id === '' ? k.sale_id : vSale_id;

	// revision '0' is Status 'C' new record. txn_qty === 0 means (k.qty - k.old_val)
	if (cloneReq.revision === 0 && txn_qty === 0) {
		txn_qty = k.qty;
	}

	//txn -ve means subtract from qty
	// example old value (5) Edited and sold (3)
	// now txn_qty will be (3) (sold qty)
	if (txn_qty < 0) {
		actn_type = 'Edited';
		txn_qty = k.qty;
	}

	// completed txn (if revision > 0) txn_qty 0 means no changes happened
	if (cloneReq.revision > 0 && txn_qty === 0) {
		skipHistoryUpdate = true;
	}

	// convert -ve to positive number
	//~ bitwise operator. Bitwise does not negate a number exactly. eg:  ~1000 is -1001, not -1000 (a = ~a + 1)
	txn_qty = ~txn_qty + 1;

	if (txn_qty !== 0 && !skipHistoryUpdate) {
		let result = await insertItemHistoryTable(
			cloneReq.center_id,
			'Sale',
			k.product_id,
			'0',
			'0',
			sale_id,
			sale_det_id,
			'SAL',
			actn_type,
			txn_qty,
			'0', // sale_return_id
			'0', // sale_return_det_id
			'0', // purchase_return_id
			'0', // purchase_return_det_id
			res,
		);
	}
};

const getNextSaleInvoiceNoAsync = (center_id, invoicetype) => {
	let query = '';

	let invoiceyear = currentTimeInTimeZone('Asia/Kolkata', 'YY');
	let invoicemonth = currentTimeInTimeZone('Asia/Kolkata', 'MM');

	if (invoicetype === 'stockissue') {
		query = `select concat('SI',"-",'${invoiceyear}', "/", '${invoicemonth}', "/", lpad(stock_issue_seq + 1, 5, "0")) as NxtInvNo from financialyear  where 
					center_id = '${center_id}' and  
					CURDATE() between str_to_date(startdate, '%d-%m-%Y') and str_to_date(enddate, '%d-%m-%Y') `;
	} else if (invoicetype === 'gstinvoice') {
		query = `select concat('${invoiceyear}', "/", '${invoicemonth}', "/", lpad(invseq + 1, 5, "0")) as NxtInvNo from financialyear  where 
					center_id = '${center_id}' and  
					CURDATE() between str_to_date(startdate, '%d-%m-%Y') and str_to_date(enddate, '%d-%m-%Y') `;
	}

	return new Promise(function (resolve, reject) {
		pool.query(query, function (err, data) {
			if (err) {
				reject(err);
			}
			resolve(data);
		});
	});
};

const insertAuditTblforDeleteSaleDetailsRecAsync = (element, sale_id) => {
	let today = currentTimeInTimeZone('Asia/Kolkata', 'YYYY-MM-DD HH:mm:ss');

	let query = `
	INSERT INTO audit_tbl (module, module_ref_id, module_ref_det_id, actn, old_value, new_value, audit_date, center_id)
	VALUES
		('Sales', '${sale_id}', '${element.id}', 'delete', 
		(SELECT CONCAT('[{', result, '}]') as final
		FROM (
			SELECT GROUP_CONCAT(CONCAT_WS(',', CONCAT('"saleId": ', sale_id), CONCAT('"productId": "', product_id, '"'), CONCAT('"qty": "', qty, '"')) SEPARATOR '},{') as result
			FROM (
				SELECT sale_id, product_id, qty
				FROM sale_detail where id = '${element.id}'
			) t1
		) t2)
		, '', '${today}', (select center_id from sale where id = '${sale_id}')
		) `;

	return new Promise(function (resolve, reject) {
		pool.query(query, function (err, data) {
			if (err) {
				reject(err);
			}
			resolve(data);
		});
	});
};

const deleteSaleDetailsRecAsync = (element) => {
	let query = `
	delete from sale_detail where id = '${element.id}' `;

	return new Promise(function (resolve, reject) {
		pool.query(query, function (err, data) {
			if (err) {
				reject(err);
			}
			resolve(data);
		});
	});
};

const updateLegerCustomerChange = (
	center_id,
	sale_id,
	customer_id,

	old_customer_id,
) => {
	let today = currentTimeInTimeZone('Asia/Kolkata', 'DD-MM-YYYY HH:mm:ss');

	let query = `delete from ledger where customer_id =  '${old_customer_id}'
	and invoice_ref_id = '${sale_id}'  and center_id = '${center_id}' `;

	return new Promise(function (resolve, reject) {
		pool.query(query, function (err, data) {
			if (err) {
				reject(err); // failure
			}

			let query2 = ` INSERT INTO audit_tbl (module, module_ref_id, module_ref_det_id, actn,
											old_value, new_value, audit_date, center_id)
											VALUES
											('Leger', '${sale_id}', '${sale_id}', 'Customer Updated',  '${old_customer_id}',
											'${customer_id}', '${today}', '${center_id}' ) `;

			return new Promise(function (resolve, reject) {
				pool.query(query2, function (err, data) {
					if (err) {
						reject(err); // failure
					}
					// success
					resolve(data);
				});
			});
		});
	});
};

const deleteSaleDetail = async (id, res) => {
	let query = `
				delete from sale_detail where id = '${id}' `;

	let deletePromise = await new Promise(function (resolve, reject) {
		pool.query(query, function (err, data) {
			if (err) {
				return reject(handleError(new ErrorHandler('500', 'Error deleting sale details', err), res));
			}
			resolve(data);
		});
	});
};

module.exports = {
	getSalesMaster,
	getSalesDetails,
	insertSaleDetails,
	IUSaleDetailsAsync,

	updateProductAsync,
	insertItemHistoryAsync,
	getNextSaleInvoiceNoAsync,
	insertAuditTblforDeleteSaleDetailsRecAsync,
	deleteSaleDetailsRecAsync,

	updateLegerCustomerChange,
	deleteSaleDetail,
};
