var mysql = require('mysql');

var pool = mysql.createPool({
	connectionLimit: 100, //important
	host: '127.0.0.1',
	user: 'root',
	password: 'tesla',
	database: 'reddotdb',
	debug: false,
});

// var pool = mysql.createPool({
// 	connectionLimit: 100, //important
// 	host: 'ec2-13-126-139-223.ap-south-1.compute.amazonaws.com',
// 	user: 'root',
// 	password: 'tesla',
// 	database: 'reddotuat',
// 	debug: false,
// 	ssl: true,
// });

module.exports = pool;
