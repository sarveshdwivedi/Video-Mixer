
var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var waterfall = require('async-waterfall');
var async = require('async');

var app = express();

var fluent_ffmpeg = require("fluent-ffmpeg");
var fs = require('fs');
var formidable = require('formidable');




//Set Port
app.set('port', (process.env.PORT || 3000));

//Set Static Path
app.use(express.static(path.join(__dirname, 'client')));

//BodyParser Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


app.post('/api/uploadVideo', function (req, res) {
    var formData = {};
    //console.log(req.body);
    waterfall([
        function (callback) {
            var form = new formidable.IncomingForm();
            //console.log(form.vol1);
            form.parse(req, function (err, fields, files) {
                formData = {};
                //console.log('files*******:- ',fields);
                if (files && Object.keys(files).length > 0) { 
                        formData.vol1 = fields.vol1;
                        formData.vol2 = fields.vol2;                   
                        var mediaNameArr = files.video1.name.split('.');
                        var mediaExt = mediaNameArr[1];
                        var date = new Date();
                        var newDate = date.getTime();
                        if (mediaExt) { // files.candidateImage.type
                            formData.video1Name = newDate + '_video1.' + mediaExt;
                            formData.file = files;
                        } else {
                            callback(err, false);
                        }

                        var mediaNameArr2 = files.video2.name.split('.');
                        var mediaExt2 = mediaNameArr2[1];
                        var date2 = new Date();
                        var newDate2 = date2.getTime();
                        if (mediaExt2) { // files.candidateImage.type
                            formData.video2Name = newDate2 + '_video2.' + mediaExt2;
                            //formData.file2 = files;
                            callback(null, formData);
                        } else {
                            callback(err, false);
                        }
                } else {
                    callback(null, formData);
                }
            });
        },
        function (formData, callback) {
            //console.log('==>>>',formData);
            if (formData.file) {
                var dir = './video/uploaded/';
                var temp_path = dir + formData.video1Name;
                var data1 = fs.readFileSync(formData.file.video1.path);
                fs.writeFile(temp_path, data1, function (err, data) {
                    if (err) {
                        callback(err, false);
                    } else {
                        callback(null, formData);
                    }
                });
            } else {
                callback(null, formData);
            }
        },
        function (formData, callback) {
            if (formData.file) {
                var dir = './video/uploaded/';
                var temp_path = dir + formData.video2Name;
                var data2 = fs.readFileSync(formData.file.video2.path);
                fs.writeFile(temp_path, data2, function (err, data) {
                    if (err) {
                        callback(err, false);
                    } else {
                        //delete formData.file1;                        
                        callback(null, formData);
                    }
                });
            } else {
                callback(null, formData);
            }
        },

        function (formData, callback) {
            //console.log('formData.video1 name:- ',formData.video1Name);
            //console.log('formData.video2 name:- ',formData.video2Name);
            var date = new Date();
            var newDate = date.getTime();
            formData.finalVideoName = newDate + '_final.mp4';

            //console.log(formData.vol1 +'--And--'+formData.vol2);
            var vol1 = formData.vol1;
            var vol2 = formData.vol2;
            var video1 = "./video/uploaded/" + formData.video1Name; //"./video/1.mp4";
            var video2 = "./video/uploaded/" + formData.video2Name; // "./video/2.mp4";
            var destination = "./video/sample/" + formData.finalVideoName;
            formData.finalVideoPath = destination;

            var mergedVideo = fluent_ffmpeg();

            mergedVideo.addInput(video1)
                .addInput(video2)
                .on('start', function (ffmpegCommand) {      // log something maybe
                    console.log('ffmpegCommand:- ', ffmpegCommand);
                })
                .on('progress', function (data) {    // to see progress
                    console.log('data:- ', data);
                })
                .on('codecData', function (data) {
                    //dat                                                                                 aObj = JSON.parse(JSON.stringify(data.video_details));
                })
                .on('end', function () {     // encoding is complete, so callback or move on at this point
                    console.log('Finished!');
                    callback(null, formData);
                    //res.send({ status: 200, message: 'Video Mixer Process Finished!' });
                })
                .on('error', function (error) {  // error handling
                    console.log('error:- ', error);
                    callback(err, false);
                    //res.send('error:- ', error)
                })
                // .clone("-c:a")

                .complexFilter("[0:a]volume="+vol1+"[a1];[1:a]volume="+vol2+"[a2];[a1][a2]amerge,pan=stereo:c0<c0+c2:c1<c1+c3[out]")
                .map("[out]")
                .addOptions("-acodec libfdk_aac")
                .audioCodec('copy')
                .output(destination)
                .run();
        },


    ], function (err, data) {
        // console.log(data);
        var fullUrl = req.protocol + '://' + req.get('host');
        if (err) {
            res.send({ status: 201, error: { 'message': err } });
        }
        else {
            res.send({ status: 200, success: { 'message': 'Video merge successfully.', videoPath: fullUrl + '/video/sample/' + data.finalVideoName } });
        }
    });
});




//Start Server
app.listen(app.get('port'), function () {
    console.log('Server has started on Port:' + app.get('port'))
});
