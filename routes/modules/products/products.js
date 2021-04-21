var pool = require('../../helpers/db');
const moment = require('moment');
const logger = require('./../../helpers/log4js');
const { handleError, ErrorHandler } = require('./../../helpers/error');
const { toTimeZone, currentTimeInTimeZone } = require('./../../helpers/utils');

const insertProduct = async (insertValues, res) => {
	let productId = await insertToProduct(insertValues, res);
	let stockInsertRes = await insertToStock(productId, insertValues, res);
	let historyAddRes = await newProductEntryToHistory(
		insertValues.center_id,
		productId,
		insertValues.currentstock,
		insertValues.mrp,
		res
	);

	return historyAddRes;
};

function insertToProduct(insertValues, res) {
	let today = currentTimeInTimeZone('Asia/Kolkata', 'YYYY-MM-DD HH:mm:ss');

	let query = `insert into 
		product 
			(center_id, brand_id, product_code, description, unit, packetsize, hsncode, currentstock, unit_price, mrp, 
				purchase_price, salesprice, rackno, location, maxdiscount, alternatecode, taxrate, 
				minqty, itemdiscount, reorderqty, avgpurprice, avgsaleprice, margin)
		VALUES
			( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? ) `;

	let values = [
		insertValues.center_id,
		insertValues.brand_id,
		insertValues.product_code,
		insertValues.description,
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
				return handleError(
					new ErrorHandler('500', 'Error insertToProduct in Productjs', err),
					res
				);
			} else {
				resolve(data.insertId);
			}
		});
	});
}

function insertToStock(productId, insertValues, res) {
	let upDate = new Date();
	todayYYMMDD = moment(upDate).format('YYYY-MM-DD');
	let query2 = `
	insert into stock (product_id, mrp, available_stock, open_stock, updateddate)
	values ('${productId}', '${insertValues.mrp}', '${insertValues.currentstock}', '${insertValues.currentstock}' , '${todayYYMMDD}')`;

	return new Promise(function (resolve, reject) {
		pool.query(query2, function (err, data1) {
			if (err) {
				return handleError(
					new ErrorHandler('500', 'Error insertToStock in Productjs', err),
					res
				);
			} else {
				resolve(data1);
			}
		});
	});
}

function newProductEntryToHistory(center_id, productId, txn_qty, mrp, res) {
	let today = currentTimeInTimeZone('Asia/Kolkata', 'DD-MM-YYYY HH:mm:ss');

	let query2 = `
			insert into item_history (center_id, module, product_ref_id, purchase_id, purchase_det_id, actn, actn_type, txn_qty, stock_level, txn_date)
			values ('${center_id}', 'Purchase', '${productId}', '0', '0', 'PUR', 'New Product', '${txn_qty}', 
							(select IFNULL(available_stock, 0) as available_stock  from stock where product_id = '${productId}' and mrp = '${mrp}' ), '${today}' ) `;

	return new Promise(function (resolve, reject) {
		pool.query(query2, function (err, data1) {
			if (err) {
				return handleError(
					new ErrorHandler(
						'500',
						'Error newProductEntryToHistory in Productjs',
						err
					),
					res
				);
			}
			resolve('success');
		});
	});
}

const updateProduct = (updateValues, callback) => {
	let today = currentTimeInTimeZone('Asia/Kolkata', 'YYYY-MM-DD HH:mm:ss');

	let query = `
			update product set center_id = '${updateValues.center_id}', brand_id = '${updateValues.brand_id}',
			product_code = '${updateValues.product_code}', description = '${updateValues.description}',unit = '${updateValues.unit}',
			packetsize = '${updateValues.packetsize}', hsncode = '${updateValues.hsncode}',currentstock = '${updateValues.currentstock}',
			unit_price = '${updateValues.unit_price}', mrp = '${updateValues.mrp}',purchase_price = '${updateValues.purchase_price}',
			salesprice = '${updateValues.salesprice}', rackno = '${updateValues.rackno}',location = '${updateValues.location}',
			maxdiscount = '${updateValues.maxdiscount}', alternatecode = '${updateValues.alternatecode}',taxrate = '${updateValues.taxrate}',
			minqty = '${updateValues.minqty}', itemdiscount = '${updateValues.itemdiscount}',reorderqty = '${updateValues.reorderqty}',
			avgpurprice = '${updateValues.avgpurprice}', avgsaleprice = '${updateValues.avgsaleprice}',margin = '${updateValues.margin}',
			rackno = '${updateValues.rackno}'
			where
			id = '${updateValues.product_id}'
	`;

	pool.query(query, function (err, data) {
		if (err) return callback(err);
		return callback(null, data);
	});
};

module.exports = {
	insertProduct,
	updateProduct,
};
