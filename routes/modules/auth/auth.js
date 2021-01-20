var pool = require("../../helpers/db");
const logger = require("./../../helpers/log4js");

// fetch rows from customer tbl & customer shipping addres tbl
const getPermissions = (center_id, role_id) => {
	let query = ` select p.* from permissions p
	where
	p.center_id = '${center_id}' and
	p.role_id = '${role_id}' `;

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
	getPermissions,
};
