var pool = require("../../helpers/db");
const logger = require("./../../helpers/log4js");

const getReturns = (center_id, callback) => {
	let sql = ` select c.name as customer_name, s.invoice_no as invoice_no,
  sum(sd.returned) as returned, sr.return_date as returned_date
  from 
  customer c,
  sale s,
  sale_return sr,
  sale_detail sd
  where
  sr.sale_id = s.id and
  c.id = s.customer_id and
  sd.sale_id = s.id and
  sr.center_id = ${center_id}
  group by 
  customer_name,
  invoice_no, returned_date `;

	console.log("object" + sql);
	return new Promise(function (resolve, reject) {
		pool.query(sql, function (err, data) {
			if (err) {
				reject(err);
			}
			resolve(data);
		});
	});
};

module.exports = {
	getReturns,
};
