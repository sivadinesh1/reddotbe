var pool = require('../../helpers/db');
const logger = require('./../../helpers/log4js');
const { toTimeZone, currentTimeInTimeZone } = require('./../../helpers/utils');

const insertItemHistoryTable = (
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
insert into item_history (center_id, module, product_ref_id, purchase_id, purchase_det_id, actn, actn_type, txn_qty, stock_level, txn_date)
values ('${center_id}', '${module}', '${product_id}', '${sale_id}', '${sale_det_id}', '${actn}', '${actn_type}', '${txn_qty}', 
				(select IFNULL(available_stock, 0) as available_stock  from stock where product_id = '${product_id}' and mrp = '${mrp}' ), '${today}' ) `;

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
	insertItemHistoryTable,
};
