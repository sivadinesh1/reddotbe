const express = require('express');
const excelRouter = express.Router();
const axios = require('axios');

const mysql = require('mysql');
const moment = require('moment');
const logger = require('../helpers/log4js');

const { handleError, ErrorHandler } = require('../helpers/error');
var pool = require('../helpers/db');

const xlsx = require('xlsx');
const fs = require('fs');

excelRouter.get('/sample-xls', (req, res) => {
	console.log('insdie sample xls');
	const wb = xlsx.readFile('./upload/Data.xlsx');

	const ws = wb.Sheets['products'];

	const data = xlsx.utils.sheet_to_json(ws);
	console.log(data);
});

module.exports = excelRouter;
