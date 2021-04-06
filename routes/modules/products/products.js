var pool = require('../../helpers/db');
const moment = require('moment');
const logger = require('./../../helpers/log4js');
const { toTimeZone, currentTimeInTimeZone } = require('./../../helpers/utils');

const insertProduct = (insertValues, callback) => {
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

	pool.query(query, values, function (err, data) {
		if (err) {
			return callback(err);
		} else {
			let upDate = new Date();
			todayYYMMDD = moment(upDate).format('YYYY-MM-DD');
			let query2 = `
			insert into stock (product_id, mrp, available_stock, open_stock, updateddate)
			values ('${data.insertId}', '${insertValues.mrp}', '${insertValues.currentstock}', '${insertValues.currentstock}' , '${todayYYMMDD}')`;

			pool.query(query2, function (err, data1) {
				if (err) {
				} else {
					return callback(null, data1);
				}
			});
		}
	});
};

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
