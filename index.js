/** @format */

const express = require("express");

const mysql = require("mysql");
const moment = require("moment");
const { handleError, ErrorHandler } = require("./routes/helpers/error");

const logger = require("./routes/helpers/log4js");

//For https
const https = require("https");
const http = require("http");

const cors = require("cors");
const fs = require("fs");

var options = {
	key: fs.readFileSync("/etc/letsencrypt/live/demo.squapl.com/privkey.pem"),
	cert: fs.readFileSync("/etc/letsencrypt/live/demo.squapl.com/cert.pem"),
	ca: fs.readFileSync("/etc/letsencrypt/live/demo.squapl.com/chain.pem"),
};

const app = express();

app.use(express.static("public"));

seqnce = 0;

var corsOptions = {
	origin: "*",
	optionsSuccessStatus: 200,
};

// logger is actual logging
app.use(logger.express);

// app.use(function (req, res, next) {
//     res.header("Access-Control-Allow-Origin", "*");
//     res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
//     next();
// });

app.use(cors(corsOptions));

app.use(
	express.json({
		limit: "50mb",
	}),
);
app.use(
	express.urlencoded({
		extended: false,
	}),
);

// general api routes
app.use("/api", require("./routes/api/general"));
app.use("/api/enquiry", require("./routes/api/enquiry"));
app.use("/api/sale", require("./routes/api/sale"));
app.use("/api/purchase", require("./routes/api/purchase"));
app.use("/api/auth", require("./routes/api/auth"));
app.use("/api/admin", require("./routes/api/admin"));
app.use("/api/stock", require("./routes/api/stock"));
app.use("/api/print", require("./routes/api/print"));
app.use("/api/accounts", require("./routes/api/accounts"));
app.use("/api/reports", require("./routes/api/reports"));
app.use("/api/dashboard", require("./routes/api/dashboard"));
app.use("/api/returns", require("./routes/api/returns"));

app.get("/openCV/:id/:filename", function (req, res) {
	var dir = process.env.UPLOAD_PATH;

	res.sendFile(dir + "/" + req.params.id + "/" + req.params.filename, {
		headers: {
			"Content-Type": "application/x-pdf",
		},
	});
});

app.get("/error", (req, res) => {
	throw new ErrorHandler(500, "Internal server error");
});

app.use((err, req, res) => {
	handleError(err, res);
});

const PORT = process.env.PORT || 5050;

// app.listen(PORT);
http.createServer(app).listen(5050);
https.createServer(options, app).listen(8440);
