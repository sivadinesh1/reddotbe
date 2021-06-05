const express = require('express');
const uploadRoute = express.Router();
const IncomingForm = require('formidable').IncomingForm;

const moment = require('moment');
const { handleError, ErrorHandler } = require('./../helpers/error');

const { updateLogo } = require('../modules/admin/admin');

uploadRoute.post('/add/:centerid/:position', (req, res) => {
	let center_id = req.params.centerid;
	let position = req.params.position;

	let logo_name = '';
	let logo_url = '';

	var form = new IncomingForm();
	console.log('111111');

	var fileNames = [];

	form.uploadDir = './upload';
	form.keepExtensions = true;
	form.maxFieldsSize = 10 * 1024 * 1024;

	form.multiples = true;

	form
		.on('error', function (err) {
			res.json({
				result: 'fail',
				data: {},
				message: `Cannot Upload images. Error is : ${err}`,
			});
			// throw err;
		})

		.on('field', function (field, value) {
			//receive form fields here
		})

		/* this is where the renaming happens */
		.on('fileBegin', function (name, file) {
			//rename the incoming file to the file's name
			// file.path = form.uploadDir + '/' + file.name;
			if (position === 'side') {
				logo_name = center_id + '-side-logo.' + getExtension(file.name);
				logo_url = form.uploadDir + '/' + center_id + '-side-logo.' + getExtension(file.name);
				file.path = form.uploadDir + '/' + center_id + '-side-logo.' + getExtension(file.name);
			} else if (position === 'main') {
				logo_name = center_id + '-logo.' + getExtension(file.name);
				logo_url = form.uploadDir + '/' + center_id + '-logo.' + getExtension(file.name);
				file.path = form.uploadDir + '/' + center_id + '-logo.' + getExtension(file.name);
			}
		})

		.on('file', function (field, file) {
			// fileNames.push(file.name);
			if (position === 'side') {
				fileNames.push(center_id + '-side-logo.' + getExtension(file.name));
			} else if (position === 'main') {
				fileNames.push(center_id + '-logo.' + getExtension(file.name));
			}
			//On file received
		})

		.on('progress', function (bytesReceived, bytesExpected) {
			//self.emit('progess', bytesReceived, bytesExpected)

			var percent = ((bytesReceived / bytesExpected) * 100) | 0;
			process.stdout.write('Uploading: %' + percent + '\r');
		})

		.on('end', async function () {
			let result = await updateLogo(center_id, logo_name, logo_url, position);
			if (result === 'success') {
				res.json({
					result: 'ok',
					data: fileNames,
					numberOfImages: fileNames.length,
					message: 'Upload images successfully',
				});
			} else {
				res.json({
					result: 'fail',
				});
			}
		});

	form.parse(req);
});

// you can send full url here
function getExtension(filename) {
	return filename.split('.').pop();
}

module.exports = uploadRoute;
