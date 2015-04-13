'use strict';

module.exports = function(grunt) {

	grunt.registerMultiTask('lokalise', 'Grunt plugin for i18n service lokali.se', function () {
		var options = this.data,
			done = this.async(),
			files = this.files[0].src,
			fs = require('fs-sync'),
			exec = require('child_process').exec,
			totalSendFiles = 0,
			sentFiles = 0;
		
		files.forEach(function (file) {
			var parts = file.split('/'),
				language = parts[parts.length - 2],
				newName = 'lokalise/' + language + '/' + file.replace(/\//g, '__').replace('__' + language, ''),
				curl = 'curl -X POST https://lokali.se/api/project/import ' +
					'-F "api_token=' + options.apiToken + '" ' +
					'-F "id=' + options.projectId + '" ' +
					'-F file=@"' + newName + '" ' +
					'-F "lang_iso=' + language + '" ' +
					'-F "replace=1" ' +
					'-F "fill_empty=0" ' +
					'-F "distinguish=1" ' +
					'-F "hidden=0"';

			totalSendFiles ++;
			fs.copy(file, newName);
			
			exec(curl, function (error, stdout, stderr) {
				if ( ! error) {
					console.log('Sent ' + file + '... OK');
					console.log(stdout);
				} else {
					console.log('Error sending ' + file);
				}

				sentFiles++;

				if (totalSendFiles === sentFiles) {
					done(true);
				}
			});
		});

	});

};
