var pool = require("../../helpers/db");

// fetch rows from customer tbl & customer shipping addres tbl
const getCenterDetails = (center_id) => {
	let query = `select c.*, s.description 
  from 
  center c,
  state s 
  where 
  c.state_id = s.id and
  c.id = '${center_id}'  `;

	console.log("getCenterDetails > " + query);

	return new Promise(function (resolve, reject) {
		pool.query(query, function (err, data) {
			if (err) {
				reject(err);
			}
			resolve(data);
		});
	});
};

module.exports = {
	getCenterDetails,
};
