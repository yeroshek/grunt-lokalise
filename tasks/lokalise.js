'use strict';

module.exports = function(grunt) {

	grunt.registerMultiTask('lokalise', 'Grunt plugin for i18n service lokalise.co', function () {
		var options = this.data,
			done = this.async(),
			files = this.files[0].src,
			fs = require('fs-sync'),
			exec = require('child_process').exec,
			totalSendFiles = 0,
			sentFiles = 0,
			filesOriginalPaths = {},
			push = true,
			pull = true,
			pushLanguages = grunt.option('lang') ? grunt.option('lang').split(',') : 'all',
			pushFiles = grunt.option('file') ? grunt.option('file').split(',') : 'all',
			curlQueries = [];

		if (grunt.option('push')) {	pull = false; }
		if (grunt.option('pull')) { push = false; }
		if ( ! pull && ! push) { pull = true; push = true; }

		if (files.length) {
			files.forEach(function (file) {
				var parts = file.split('/'),
					language = parts[parts.length - 2],
					fileName = parts[parts.length - 1],
					curl = 'curl -X POST https://lokalise.co/api/project/import ' +
						'-F "api_token=' + options.apiToken + '" ' +
						'-F "id=' + options.projectId + '" ' +
						'-F file=@"' + file + '" ' +
						'-F "lang_iso=' + language + '" ' +
						'-F "replace=' + (grunt.option('replace') ? '1' : '0') + '" ' +
						'-F "fill_empty=0" ' +
						'-F "distinguish=1" ' +
						'-F "hidden=0"';

				filesOriginalPaths[fileName] = file;
				
				if (pushLanguages !== 'all' && pushLanguages.indexOf(language) === -1) { return; }
				if (pushFiles !== 'all' && pushFiles.indexOf(fileName) === -1) { return; }
				if ( ! push) { return; }
				
				curlQueries.push({ curl: curl, running: false, fileName: file });
			});

			pushData(curlQueries);

		} else {
			downloadData();
		}

		if ( ! push) { downloadData(); }

		function pushData (curlQueries) {
			var maxConcurrent = 1,
				concurrentCalls = 0,
				sentFiles = 0;

			runQueueTasks();

			function runQueueTasks () {
				curlQueries.forEach(function (task) {

					if (concurrentCalls < maxConcurrent && task && ! task.running) {
						concurrentCalls ++;

						setTimeout(runTask.bind(this, task), 5000);
					}
				});
			}

			function runTask (task) {
				task.running = true;

				exec(task.curl, function (error, stdout, stderr) {

					if ( ! error) {
						try {
							var answer = JSON.parse(stdout);	
						
						} catch (e) {
							console.log(curl);
							console.log('Non-valid JSON', stdout);
							
							done(false);
							return false;
						}
						
						
						if (answer.response && answer.response.status && answer.response.status === 'success') {
							console.log('Sent ' + task.fileName + '... OK');	
						} else {
							console.log('Error sending ' + task.fileName + ': ' + answer.response.message);
						}
						
					} else {
						console.log('Error sending ' + task.fileName, error);
					}

					sentFiles++;
					concurrentCalls--;
					task = null;

					if (curlQueries.length <= sentFiles) {
						downloadData();
					} else {
						runQueueTasks();
					}
				});
			}
		}
		
		function downloadData () {
			if ( ! pull) { done(true); return; }

			var curl = 'curl -X POST https://lokalise.co/api/project/export ' +
     			'-d "api_token=' + options.apiToken + '" ' +
     			'-d "id=' + options.projectId + '" ' +
     			'-d "type=json" ' +
     			'-d "use_original=1" ';

     		console.log('Generating bundle...');

			exec(curl, function (error, stdout, stderr) {
				if ( ! error) {
					try {
						var answer = JSON.parse(stdout);
					
					} catch (e) {
						console.log('Non-valid JSON', stdout);

						done(false);
						return false;
					}
					
					if (answer.response && answer.response.status && answer.response.status === 'success') {
						
						extractData(answer.bundle.file);

					} else {
						console.log('Error exporting bundle: ' + answer.response.message);
					}

				} else {
					console.log('Error exporting bundle');
					done(false);
				}
			});
		}

		function extractData(file) {
			var curl = 'curl -L -O http://lokalise.co/' + file,
				parts = file.split('/'),
				fileName = parts[parts.length - 1],
				unzip;

			console.log('Downloading bundle from lokalise.co/' + file + '...');
			exec(curl, function (error, stdout, stderr) {
				if ( ! error) {

					fs.remove('lokalise');
					fs.mkdir('lokalise');

					unzip = 'unzip ' + fileName + ' -d lokalise/';

					console.log('Unpacking bundle...');
					exec(unzip, function (error, stdout, stderr) {
						if ( ! error) {
							processFiles(fs.expand('lokalise/**/**.**'));

						} else {
							console.log('Error unpacking bundle');
							done(false);
						}

						fs.remove(fileName);
					});

				} else {
					console.log('Error downloading bundle');
					done(false);
				}
			});
		}

		/**
		 * Конвертит json файл в php
		 *
		 * @param filename
		 * @returns {string}
		 */
		function jsonToPhp(filename) {

			var filework = require('fs');
			var div = filename.split('.');

			var newFilename = div[0] + '.php';
			var contents = filework.readFileSync(filename, 'utf8');
			var json = JSON.parse(contents);

			var newContent = "<?php \n";
			for(var key in json){
				newContent = newContent + ("$lang[\"" + key + "\"] = \""+ json[key] + "\";\n");
			};
			filework.writeFileSync(newFilename, newContent);
			return newFilename;

		}

		function processFiles(filenames) {
			console.log('Writing ' + filenames.length + ' files...');

			filenames.forEach(function (filename) {
				var parts = filename.split('/'),
					language = parts[1],
					fileName = parts[2],
					original = filesOriginalPaths[fileName];
				if (original === undefined) {
					filename = jsonToPhp(filename);
					parts = filename.split('/');
					language = parts[1];
					fileName = parts[2];
					original = filesOriginalPaths[fileName];

				}
				var originalParts = original.split('/');

				originalParts[originalParts.length - 2] = language;

				fs.copy(filename, originalParts.join('/'), { force: true });
			});

			fs.remove('lokalise/');
			done(true);
		}

	});

};
