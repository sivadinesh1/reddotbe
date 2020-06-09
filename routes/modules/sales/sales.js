var pool = require("../../helpers/db");

const getSalesMaster = (sales_id, callback) => {
	let sql = `
  select s.*
from
sale s
where
s.id = '${sales_id}' `;
	console.log("dinesh" + sql);
	pool.query(sql, function (err, data) {
		if (err) {
			console.log("Error executing query", err);
			return callback(err);
		}
		console.log("Query executed");
		return callback(null, data);
	});
};

module.exports = {
	getSalesMaster,
};
