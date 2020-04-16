const express = require("express");
const authRoute = express.Router();

var pool = require("./../helpers/db");
const { handleError, ErrorHandler } = require("./../helpers/error");

authRoute.post("/login", (req, res) => {
	const [username, password] = Object.values(req.body);

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

	pool.query(query, function(err, data) {
		if (err) {
			return handleError(new ErrorHandler("100", "Error while authenticating."), res);
		} else if (data.length > 0) {
			return res.status(200).json({
				result: "success",
				role: data[0].role,
				userid: data[0].userid,
				obj: data[0]
			});
		} else {
			return handleError(new ErrorHandler("600", "Invalid Credentials."), res);
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
