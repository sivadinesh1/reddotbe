const express = require('express');
const authRoute = express.Router();
const logger = require('../../routes/helpers/log4js');
const bcrypt = require('bcrypt');
const env = require('dotenv/config');
var pool = require('./../helpers/db');
const { handleError, ErrorHandler } = require('./../helpers/error');

const {
	getPermissions,
	checkUsernameExists,
} = require('../modules/auth/auth.js');
const e = require('express');

// if(await bcrypt.compare(password, user.hashed_password)) {
// 	console.log('object ::: password matched' )

authRoute.post('/login', async (req, res) => {
	const [username, password] = Object.values(req.body);

	let user = await checkUsernameExists(username);

	if (user != null) {
		// check password
		if (await bcrypt.compare(password, user[0].userpass)) {
			console.log('object ::: password matched');
			return res.status(200).json({
				result: 'success',
				role: user[0].role,
				userid: user[0].userid,
				obj: user[0],
			});
		} else {
			return handleError(
				new ErrorHandler(
					'600',
					'Invalid Credentials.',
					`invalid credentials: ${username} ${password}`
				),
				res
			);
		}
	} else {
		// res.json({ 'message': 'Error while authenticating' });
		return handleError(
			new ErrorHandler(
				'100',
				'Error while authenticating.',
				`invalid credentials: ${username} ${password}`
			),
			res
		);
	}

	// let query = `select u.id as userid, u.username, u.firstname, r.name as role, r.id as role_id, c.id as center_id, c.name as center_name, cm.id as company_id,
	// cm.name as company_name, s.code, p.name as plan_name
	// from
	// users u,
	// user_role ur,
	// role r,
	// center c,
	// state s,
	// company cm,
	// plans p,
	// subscriptions subs
	// where
	// subs.plan_id = p.id and
	// subs.center_id = u.centerid and
	// subs.is_active = 'Y' and

	// s.id = c.state_id and
	// u.id = ur.user_id and
	// ur.role_id = r.id and
	// u.centerid = c.id and
	// cm.id = c.company_id and
	// username='${username}' and
	// userpass='${password}' `;

	// pool.query(query, function (err, data) {
	// 	if (err) {
	// 		return handleError(new ErrorHandler("100", "Error while authenticating."), res);
	// 	} else if (data.length > 0) {
	// 		return res.status(200).json({
	// 			result: "success",
	// 			role: data[0].role,
	// 			userid: data[0].userid,
	// 			obj: data[0],
	// 		});
	// 	} else {
	// 		return handleError(new ErrorHandler("600", "Invalid Credentials."), res);
	// 	}
	// });
});

authRoute.get('/fetch-permissions/:centerid/:roleid', async (req, res) => {
	let center_id = req.params.centerid;
	let role_id = req.params.roleid;

	let rows = await getPermissions(center_id, role_id);
	return res.status(200).json(rows);
});

authRoute.get('/logs', function (req, res, next) {
	let filePath = '/usr/local/server/reddotuat/logs/log.log';

	// if (process.env.NODE_ENV === 'development') {
	// 	filePath = process.env.DEV_LOG_PATH;
	// } else if (process.env.NODE_ENV === 'production') {
	// 	filePath = process.env.PROD_LOG_PATH;
	// } else if (process.env.NODE_ENV === 'uat') {
	// 	filePath = process.env.UAT_LOG_PATH;
	// }

	res.sendFile(filePath, function (err) {
		if (err) {
			next(err);
		} else {
			console.log('Sent the logs..');
		}
	});
});

authRoute.get('/access-logs', function (req, res, next) {
	let filePath = '/usr/local/server/reddotuat/logs/access-log.log';

	// if (process.env.NODE_ENV === 'development') {
	// 	filePath = process.env.DEV_ACCESS_LOG_PATH;
	// } else if (process.env.NODE_ENV === 'production') {
	// 	filePath = process.env.PROD_ACCESS_LOG_PATH;
	// } else if (process.env.NODE_ENV === 'uat') {
	// 	filePath = process.env.UAT_ACCESS_LOG_PATH;
	// }

	res.sendFile(filePath, function (err) {
		if (err) {
			next(err);
		} else {
			console.log('Sent the logs..');
		}
	});
});

module.exports = authRoute;
