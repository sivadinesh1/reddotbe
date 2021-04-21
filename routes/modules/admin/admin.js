var pool = require('../../helpers/db');
const moment = require('moment');
const logger = require('./../../helpers/log4js');
const { toTimeZone, currentTimeInTimeZone } = require('./../../helpers/utils');

const { encryptPassword } = require('../../helpers/utils');
const bcrypt = require('bcrypt');

const isUserExist = async (insertValues) => {
	let today = currentTimeInTimeZone('Asia/Kolkata', 'YYYY-MM-DD HH:mm:ss');
	let hashed_password = await encryptPassword(insertValues.password);

	let sql = ` select * from users where 
	  username = ${insertValues.username} `;

	return new Promise(function (resolve, reject) {
		pool.query(sql, function (err, data) {
			// todo dinesh err Error: ER_DUP_ENTRY: Duplicate entry '9999999993' for key 'username_UNIQUE'

			if (err) {
				reject(err);
			}

			if (data.length > 0) {
				resolve('DUP_USERNAME');
			} else {
				resolve('');
			}
		});
	});
};

const insertUser = async (insertValues) => {
	let today = currentTimeInTimeZone('Asia/Kolkata', 'YYYY-MM-DD HH:mm:ss');
	let hashed_password = await encryptPassword(insertValues.password);

	let query = `  insert into users (centerid, username, userpass, firstname, mobilenumber, createddatetime, status ) VALUES (?, ?, ?, ?, ?, '${today}', 'A')`;

	let values = [
		insertValues.center_id,
		insertValues.username,
		hashed_password,
		insertValues.firstname,
		insertValues.username,
	];

	return new Promise(function (resolve, reject) {
		pool.query(query, values, function (err, data) {
			// todo dinesh err Error: ER_DUP_ENTRY: Duplicate entry '9999999993' for key 'username_UNIQUE'

			if (err) {
				reject(err);
			}
			resolve(data.insertId);
		});
	});
};

const insertUserRole = (insertValues) => {
	let today = currentTimeInTimeZone('Asia/Kolkata', 'YYYY-MM-DD HH:mm:ss');

	let query = `  insert into user_role (role_id, user_id ) VALUES (?, ?)`;

	let values = [insertValues.role_id, insertValues.user_id];

	return new Promise(function (resolve, reject) {
		pool.query(query, values, function (err, data) {
			if (err) {
				reject(err);
			}
			resolve(data);
		});
	});
};

const updateUserStatus = (updateValues) => {
	let today = currentTimeInTimeZone('Asia/Kolkata', 'YYYY-MM-DD HH:mm:ss');

	let query = `  update users set status = ? where id = ? `;

	let values = [updateValues.status, updateValues.id];

	return new Promise(function (resolve, reject) {
		pool.query(query, values, function (err, data) {
			if (err) {
				reject(err);
			}

			resolve(data);
		});
	});
};

const getUsers = (center_id, status) => {
	let query = `
  select u.*, r.id as role_id, r.name as role, r.description as description from 
users u,
role r,
user_role ur
where
u.id = ur.user_id and
ur.role_id = r.id and
u.centerid = '${center_id}' and status = '${status}'
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

const getOutstandingBalance = (center_id, limit) => {
	let query = ` select * from customer where center_id = '${center_id}' order by balance_amt desc limit ${limit} `;

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
	insertUser,
	updateUserStatus,
	insertUserRole,
	getUsers,
	getOutstandingBalance,
	isUserExist,
};
