var pool = require('../../helpers/db');
const moment = require('moment');
const logger = require('./../../helpers/log4js');
const { handleError, ErrorHandler } = require('./../../helpers/error');
const { toTimeZone, toTimeZoneFrmt, currentTimeInTimeZone, escapeText } = require('./../../helpers/utils');

const { insertItemHistoryTable, insertToStock } = require('../../modules/stock/stock.js');

const insertProduct = async (insertValues, res) => {
	let productId = await insertToProduct(insertValues, res);
	let stockInsertRes = await insertToStock(productId, insertValues.mrp, insertValues.currentstock, insertValues.currentstock, res);

	let historyAddRes = await insertItemHistoryTable(
		insertValues.center_id,
		'Purchase',
		productId,
		'0',
		'0',
		'0',
		'0',
		'PUR',
		`New Product - ${insertValues.mrp}`,
		insertValues.currentstock,
		'0', // sale_return_id
		'0', // sale_return_det_id
		'0', // purchase_return_id
		'0', // purchase_return_det_id
		res,
	);

	return historyAddRes;
};

function insertToProduct(insertValues, res) {
	let today = currentTimeInTimeZone('Asia/Kolkata', 'YYYY-MM-DD HH:mm:ss');

	let escapedDescription = escapeText(insertValues.description);

	let query = `insert into 
		product 
			(center_id, brand_id, product_code, description, unit, packetsize, hsncode, currentstock, unit_price, mrp, 
				purchase_price, salesprice, rackno, location, maxdiscount, alternatecode, taxrate, 
				minqty, itemdiscount, reorderqty, avgpurprice, avgsaleprice, margin, createdon)
		VALUES
			( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '${today}' ) `;

	let values = [
		insertValues.center_id,
		insertValues.brand_id,
		insertValues.product_code,
		escapedDescription,
		insertValues.unit,
		insertValues.packetsize,
		insertValues.hsncode,
		insertValues.currentstock,
		insertValues.unit_price,
		insertValues.mrp,
		insertValues.purchase_price,
		insertValues.salesprice,
		insertValues.rackno,
		insertValues.location,
		insertValues.maxdiscount,
		insertValues.alternatecode,
		insertValues.taxrate,
		insertValues.minqty,
		insertValues.itemdiscount,
		insertValues.reorderqty,
		insertValues.avgpurprice,
		insertValues.avgsaleprice,
		insertValues.margin,
	];

	return new Promise(function (resolve, reject) {
		pool.query(query, values, function (err, data) {
			if (err) {
				return handleError(new ErrorHandler('500', 'Error insertToProduct in Productjs', err), res);
			} else {
				resolve(data.insertId);
			}
		});
	});
}

// function insertToStock(productId, insertValues, res) {
// 	let upDate = new Date();
// 	todayYYMMDD = toTimeZoneFrmt(upDate, 'Asia/Kolkata', 'YYYY-MM-DD');

// 	let query2 = `
// 	insert into stock (product_id, mrp, available_stock, open_stock, updateddate)
// 	values ('${productId}', '${insertValues.mrp}', '${insertValues.currentstock}', '${insertValues.currentstock}' , '${todayYYMMDD}')`;

// 	return new Promise(function (resolve, reject) {
// 		pool.query(query2, function (err, data1) {
// 			if (err) {
// 				return handleError(new ErrorHandler('500', 'Error insertToStock in Productjs', err), res);
// 			} else {
// 				resolve(data1);
// 			}
// 		});
// 	});
// }

const updateProduct = (updateValues, res) => {
	let today = currentTimeInTimeZone('Asia/Kolkata', 'YYYY-MM-DD HH:mm:ss');

	let escapedDescription = escapeText(updateValues.description);

	let query = `
			update product set center_id = '${updateValues.center_id}', brand_id = '${updateValues.brand_id}',
			product_code = '${updateValues.product_code}', description = '${escapedDescription}',unit = '${updateValues.unit}',
			packetsize = '${updateValues.packetsize}', hsncode = '${updateValues.hsncode}',currentstock = '${updateValues.currentstock}',
			unit_price = '${updateValues.unit_price}', mrp = '${updateValues.mrp}',purchase_price = '${updateValues.purchase_price}',
			salesprice = '${updateValues.salesprice}', rackno = '${updateValues.rackno}',location = '${updateValues.location}',
			maxdiscount = '${updateValues.maxdiscount}', alternatecode = '${updateValues.alternatecode}',taxrate = '${updateValues.taxrate}',
			minqty = '${updateValues.minqty}', itemdiscount = '${updateValues.itemdiscount}',reorderqty = '${updateValues.reorderqty}',
			avgpurprice = '${updateValues.avgpurprice}', avgsaleprice = '${updateValues.avgsaleprice}',margin = '${updateValues.margin}',
			rackno = '${updateValues.rackno}', updatedon = '${today}'
			where
			id = '${updateValues.product_id}'
	`;
	return new Promise(function (resolve, reject) {
		pool.query(query, function (err, data) {
			if (err) {
				return handleError(new ErrorHandler('500', `QUERY: ${query} Error updateProduct in Productjs`, err), res);
			} else {
				resolve('success');
			}
		});
	});
};

module.exports = {
	insertProduct,
	updateProduct,
};
