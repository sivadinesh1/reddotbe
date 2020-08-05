const IncomingForm = require("formidable").IncomingForm;
//const fs = require('fs');

module.exports = function upload(req, res) {
	var form = new IncomingForm();

	var fileNames = [];

	form.uploadDir = "./upload";
	form.keepExtensions = true;
	form.maxFieldsSize = 10 * 1024 * 1024;

	form.multiples = true;

	form
		.on("error", function (err) {
			res.json({
				result: "fail",
				data: {},
				message: `Cannot Upload images. Error is : ${err}`,
			});
		})

		.on("field", function (field, value) {
			//receive form fields here
		})

		/* this is where the renaming happens */
		.on("fileBegin", function (name, file) {
			//rename the incoming file to the file's name
			file.path = form.uploadDir + "/" + file.name;
		})

		.on("file", function (field, file) {
			fileNames.push(file.name);
			//On file received
		})

		.on("progress", function (bytesReceived, bytesExpected) {
			//self.emit('progess', bytesReceived, bytesExpected)

			var percent = ((bytesReceived / bytesExpected) * 100) | 0;
			process.stdout.write("Uploading: %" + percent + "\r");
		})

		.on("end", function () {
			res.json({
				result: "ok",
				data: fileNames,
				numberOfImages: fileNames.length,
				message: "Upload images successfully",
			});
		});

	form.parse(req);
};
