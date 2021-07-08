var pool = require('../../helpers/db');
const logger = require('./../../helpers/log4js');
const { toTimeZone, toTimeZoneFrmt, currentTimeInTimeZone } = require('./../../helpers/utils');

const { handleError, ErrorHandler } = require('./../../helpers/error');

const insertItemHistoryTable = (
	center_id,
	module,
	product_id,
	purchase_id,
	purchase_det_id,
	sale_id,
	sale_det_id,
	actn,
	actn_type,
	txn_qty,
	sale_return_id,
	sale_return_det_id,
	purchase_return_id,
	purchase_return_det_id,
	res,
) => {
	let today = currentTimeInTimeZone('Asia/Kolkata', 'DD-MM-YYYY HH:mm:ss');

	let query2 = `
insert into item_history (center_id, module, product_ref_id, purchase_id, purchase_det_id, sale_id, sale_det_id, actn, actn_type, txn_qty, stock_level, txn_date, sale_return_id, sale_return_det_id, purchase_return_id, purchase_return_det_id)
values ('${center_id}', '${module}', '${product_id}', '${purchase_id}', '${purchase_det_id}',
'${sale_id}', '${sale_det_id}',
'${actn}', '${actn_type}', '${txn_qty}',
				(select IFNULL(sum(available_stock), 0) as available_stock  from stock where product_id = '${product_id}'  ), '${today}', '${sale_return_id}', '${sale_return_det_id}', '${purchase_return_id}', '${purchase_return_det_id}' ) `;
	console.log('dinesh AAA ' + query2);
	return new Promise(function (resolve, reject) {
		pool.query(query2, function (err, data) {
			if (err) {
				return handleError(new ErrorHandler('500', 'Error insertItemHistoryTable in Stockjs', err), res);
			}
			// success
			resolve(data);
		});
	});
};

const updateStock = (qty_to_update, product_id, mrp, mode, res) => {
	let query =
		mode === 'add'
			? `update stock set available_stock =  available_stock + '${qty_to_update}' where product_id = '${product_id}' and mrp = '${mrp}' `
			: `update stock set available_stock =  available_stock - '${qty_to_update}' where product_id = '${product_id}' and mrp = '${mrp}' `;

	console.log('dinesh WW' + query);

	return new Promise(function (resolve, reject) {
		pool.query(query, function (err, data) {
			if (err) {
				return reject(new ErrorHandler('500', `Error updateStock in Stockjs. QUERY: ${query}`, err), res);
			}
			return resolve(data);
		});
	});
};

// dinesh check
// multiply by * -1 so that qty_to_update is minus, query works as expected
const updateStockViaId = (qty_to_update, product_id, stock_id, mode, res) => {
	let query =
		mode === 'add'
			? `update stock set available_stock =  available_stock + '${qty_to_update}' where product_id = '${product_id}' and id = '${stock_id}' `
			: `update stock set available_stock =  available_stock - '${qty_to_update}' where product_id = '${product_id}' and id = '${stock_id}' `;

	console.log('dinesh ** ' + query);

	return new Promise(function (resolve, reject) {
		pool.query(query, function (err, data) {
			if (err) {
				return reject(new ErrorHandler('500', `Error updateStockViaId in Stockjs. QUERY: ${query}`, err), res);
			}
			return resolve(data);
		});
	});
};

const isStockIdExist = (k, res) => {
	todayYYMMDD = currentTimeInTimeZone('Asia/Kolkata', 'YYYY-MM-DD');
	let query2 = `
	select count(*) as count from stock where product_id = '${k.product_id}' and mrp  = '${k.mrp}' `;
	console.log('dinesh' + query2);
	return new Promise(function (resolve, reject) {
		pool.query(query2, function (err, data) {
			if (err) {
				return reject(new ErrorHandler('500', `Error checkStockIdPresent in Purchasejs. ${query2}`, err), res);
			} else {
				console.log('dinesh ' + data);
				console.log('dinesh ' + data[0].count);
				resolve(data[0].count);
			}
		});
	});
};

const insertToStock = (product_id, mrp, available_stock, open_stock, res) => {
	let upDate = new Date();
	todayYYMMDD = toTimeZoneFrmt(upDate, 'Asia/Kolkata', 'YYYY-MM-DD');

	let query2 = `
	insert into stock (product_id, mrp, available_stock, open_stock, updateddate)
	values ('${product_id}', '${mrp}', '${available_stock}', '${open_stock}' , '${todayYYMMDD}')`;

	return new Promise(function (resolve, reject) {
		pool.query(query2, function (err, data1) {
			if (err) {
				return handleError(new ErrorHandler('500', 'Error insertToStock in stockjs', err), res);
			} else {
				resolve(data1);
			}
		});
	});
};

module.exports = {
	insertItemHistoryTable,
	updateStock,
	updateStockViaId,
	isStockIdExist,
	insertToStock,
};
