var pool = require('../../helpers/db');
const logger = require('./../../helpers/log4js');

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

const checkUsernameExists = (username) => {
	let query = `
  select u.id as userid, u.username, u.userpass as userpass, u.firstname, r.name as role, r.id as role_id, c.id as center_id, c.name as center_name, cm.id as company_id,
	cm.name as company_name, s.code, p.name as plan_name
	from
	users u,
	user_role ur,
	role r,
	center c,
	state s,
	company cm,
	plans p,
	subscriptions subs
	where
	subs.plan_id = p.id and
	subs.center_id = u.centerid and
	subs.is_active = 'Y' and

	s.id = c.state_id and
	u.id = ur.user_id and
	ur.role_id = r.id and
	u.centerid = c.id and
	cm.id = c.company_id and
	username='${username}'
	 `;

	return new Promise(function (resolve, reject) {
		pool.query(query, function (err, data) {
			if (err) {
				reject(err);
			}
			resolve(data);
		});
	});
};

const updateCenterForSuperAdmin = (center_id) => {
	let query = `  update users set centerid = ${center_id} where username = 9999999990 `;

	return new Promise(function (resolve, reject) {
		pool.query(query, function (err, data) {
			if (err) {
				reject(err);
			}

			resolve('success');
		});
	});
};

module.exports = {
	getPermissions,
	checkUsernameExists,
	updateCenterForSuperAdmin,
};
