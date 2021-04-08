var pool = require('../../helpers/db');
const logger = require('./../../helpers/log4js');
const { toTimeZone, currentTimeInTimeZone } = require('./../../helpers/utils');

const getSalesMaster = (sales_id, callback) => {
	let sql = `select s.* from sale s where s.id = '${sales_id}' `;

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
		( '${newPK}', '${k.product_id}', '${k.qty}', '${k.disc_percent}', '${
		k.disc_value
	}', '${k.disc_type}', '${(k.total_value - k.disc_value) / k.qty}', '${
		k.mrp
	}', 
	
		'${currentTimeInTimeZone('Asia/Kolkata', 'DD-MM-YYYY')}',
		'${k.taxrate}', '${k.igst}', 
		'${k.cgst}', '${k.sgst}', '${k.taxable_value}', '${k.total_value}', '${
		k.stock_pk
	}')`;

	let upQuery100 = `update sale_detail set product_id = '${
		k.product_id
	}', qty = '${k.qty}', disc_percent = '${k.disc_percent}', 
disc_value = '${k.disc_value}',	disc_type= '${k.disc_type}', unit_price = '${
		(k.total_value - k.disc_value) / k.qty
	}', mrp = '${k.mrp}', 
		batchdate = '${currentTimeInTimeZone('Asia/Kolkata', 'DD-MM-YYYY')}', tax = '${
		k.taxrate
	}',
		igst = '${k.igst}', cgst = '${k.cgst}', sgst = '${k.sgst}', 
		taxable_value = '${k.taxable_value}', total_value = '${
		k.total_value
	}', stock_id = '${k.stock_pk}'
		where
		id = '${k.sale_det_id}' `;

	return new Promise(function (resolve, reject) {
		pool.query(
			k.sale_det_id === '' ? insQuery100 : upQuery100,
			function (err, data) {
				if (err) {
					reject(err);
				}
				resolve(data);
			}
		);
	});
};

const updateStockAsync = (k) => {
	// after sale details is updated, then update stock (as this is sale, reduce available stock) tbl & product tbl
	let qty_to_update = k.qty - k.old_val;

	let query2 = `update stock set available_stock =  available_stock - '${qty_to_update}' where product_id = '${k.product_id}' and id = '${k.stock_pk}'  `;

	return new Promise(function (resolve, reject) {
		pool.query(query2, function (err, data) {
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

const insertItemHistoryAsync = (k, vSale_id, vSale_det_id, cloneReq) => {
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

	console.log('dinesh k.qty >> ' + k.qty);
	console.log('dinesh k.old_val >> ' + k.old_val);
	console.log('dinesh >> ' + cloneReq.revision);

	// revision '0' is Status 'C' new record
	if (cloneReq.revision === 0 && txn_qty === 0) {
		txn_qty = k.qty;
	}

	//txn -ve means subtract from qty
	if (txn_qty < 0) {
		actn_type = 'Edited';
	}

	if (cloneReq.revision > 0 && txn_qty === 0) {
		skipHistoryUpdate = true;
	}

	// convert -ve to positive number
	//~ bitwise operator. Bitwise does not negate a number exactly. eg:  ~1000 is -1001, not -1000 (a = ~a + 1)
	txn_qty = ~txn_qty + 1;

	if (txn_qty !== 0 && !skipHistoryUpdate) {
		let query2 = `
			insert into item_history (center_id, module, product_ref_id, sale_id, sale_det_id, actn, actn_type, txn_qty, stock_level, txn_date)
			values ('${cloneReq.center_id}', 'Sale', '${k.product_id}', '${sale_id}', '${sale_det_id}', 'SAL', '${actn_type}', '${txn_qty}', 
							(select (available_stock)  from stock where product_id = '${k.product_id}' and mrp = '${k.mrp}' ), '${today}' ) `;

		return new Promise(function (resolve, reject) {
			pool.query(query2, function (err, data) {
				if (err) {
					reject(err); // failure
				}
				// success
				resolve(data);
			});
		});
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
	INSERT INTO audit_tbl (module, module_ref_id, module_ref_det_id, actn, old_value, new_value, audit_date)
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
		, '', '${today}'
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

const updateStockWhileDeleteAsync = (element) => {
	let query = `update stock set available_stock =  available_stock + '${element.qty}'
	where product_id = '${element.product_id}' and id = '${element.stock_id}'  `;

	return new Promise(function (resolve, reject) {
		pool.query(query, function (err, data) {
			if (err) {
				reject(err);
			}
			resolve(data);
		});
	});
};

const updateItemHistoryTable = (
	center_id,
	module,
	product_id,
	sale_id,
	sale_det_id,
	actn,
	actn_type,
	txn_qty,
	mrp
) => {
	let today = currentTimeInTimeZone('Asia/Kolkata', 'DD-MM-YYYY HH:mm:ss');

	let query2 = `
insert into item_history (center_id, module, product_ref_id, sale_id, sale_det_id, actn, actn_type, txn_qty, stock_level, txn_date)
values ('${center_id}', '${module}', '${product_id}', '${sale_id}', '${sale_det_id}', '${actn}', '${actn_type}', '${txn_qty}', 
				(select (available_stock)  from stock where product_id = '${product_id}' and mrp = '${mrp}' ), '${today}' ) `;

	return new Promise(function (resolve, reject) {
		pool.query(query2, function (err, data) {
			if (err) {
				reject(err); // failure
			}
			// success
			resolve(data);
		});
	});
};

module.exports = {
	getSalesMaster,
	getSalesDetails,
	insertSaleDetails,
	IUSaleDetailsAsync,
	updateStockAsync,
	updateProductAsync,
	insertItemHistoryAsync,
	getNextSaleInvoiceNoAsync,
	insertAuditTblforDeleteSaleDetailsRecAsync,
	deleteSaleDetailsRecAsync,
	updateStockWhileDeleteAsync,
	updateItemHistoryTable,
};
