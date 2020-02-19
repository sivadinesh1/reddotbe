const express = require("express");
const authRoute = express.Router();

const mysql = require("mysql");
const moment = require("moment");

const connection = mysql.createConnection({
	host: "localhost",
	user: "root",
	password: "filia",
	database: "reddotdb"
});

authRoute.post("/login", (req, res) => {
	let jsonObj = req.body;

	const username = jsonObj["username"];
	const password = jsonObj["password"];

	console.log("object" + username);
	console.log("object " + password);

	let query = `select u.id as userid, u.username, u.firstname, r.name as role, c.id as center_id, c.name as center_name, cm.id as company_id,
	cm.name as company_name, s.code
	from
	users u,
	user_role ur,
	role r,
	center c,
	state s,
	company cm
	where
	s.id = c.state_id and
	u.id = ur.user_id and
	ur.role_id = r.id and
	u.centerid = c.id and
	cm.id = c.company_id and
	username='${username}' and
	userpass='${password}' `;

	connection.query(query, function(err, data) {
		if (err) {
			console.log("object..." + err);
			res.status(500).json({
				result: "NOTOK",
				message: `ERROR While updating.`
			});
		}

		if (data.length > 0) {
			console.log("object pass match" + JSON.stringify(data));
			console.log("object..." + data[0].userId);
			res.json({
				message: "SUCCESS",
				role: data[0].role,
				userid: data[0].userid,
				obj: data[0]
			});
		} else {
			console.log("object pass mismatch");
			res.json({
				message: "FAILURE",
				additionalinfo: "INVALID_CREDENTIALS"
			});
		}
	});
});

module.exports = authRoute;

// select * from `financialyear` where center_id = '1' and  CURDATE() between str_to_date(startdate, '%d-%m-%Y') and str_to_date(enddate, '%d-%m-%Y')
// select * from `financialyear` where center_id = '1' and  str_to_date('01-05-2019','%d-%m-%Y') between str_to_date(startdate, '%d-%m-%Y') and str_to_date(enddate, '%d-%m-%Y')

// select u.firstname, u.username, c.id as center_id, c.name as center_name, cm.id as company_id,
// cm.name as company_name
// from
// users u,
// center c,
// company cm
// where
// username='admin' and
// userpass='admin'
