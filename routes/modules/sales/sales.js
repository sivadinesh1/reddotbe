var pool = require("../../helpers/db");
const logger = require("./../../helpers/log4js");

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

module.exports = {
	getSalesMaster,
	getSalesDetails,
};
