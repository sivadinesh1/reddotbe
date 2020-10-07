const log4js = require("log4js");
const LOG_PATH = "./logs";

// log4js.configure({
// 	appenders: { fileAppender: { type: "file", filename: LOG_PATH } },
// 	categories: { default: { appenders: ["fileAppender"], level: "info" } },
// });

log4js.configure({
	appenders: {
		access: {
			type: "dateFile",
			filename: `${LOG_PATH}/access.log`,
			pattern: "-yyyy-MM-dd",
			backups: 3,
		},
		debug: {
			type: "dateFile",
			filename: `${LOG_PATH}/debug.log`,
			pattern: "-yyyy-MM-dd",
			backups: 3,
		},
	},
	categories: {
		default: { appenders: ["access"], level: "ALL" },
		access: { appenders: ["access"], level: "DEBUG" },
		debug: { appenders: ["debug"], level: "DEBUG" },
	},
});

module.exports = {
	//	access: log4js.getLogger("access"),

	debug: log4js.getLogger("debug"),
	express: log4js.connectLogger(log4js.getLogger("access"), { level: log4js.levels.INFO }),
};

// https://www.youtube.com/watch?v=To9F0Xv3adk&ab_channel=IBMDeveloper
// LOG4JS ref
// https://medium.com/@igniz87/using-log4js-to-logging-express-js-apps-c075d1d39f0e
