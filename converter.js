require('babel-polyfill');

var fs              = require('fs');
var path            = require('path');
var converter       = require('i18next-conv');
var mkdirp          = require('mkdirp');

var translationDir  = 'translations/';

var isJSON = (file) => file.split('.').pop() === 'json';
var sanitizeValues = (values) => values.map((value) => value.replace(/<(?:.|\n)*?>/gm, ''));

var getJSONFiles = function() {
  var blacklist = ['package.json'];

  return new Promise(function(resolve){
    fs.readdir('./', function(err, files){
      if (err) throw err;

      var jsonFiles = files.filter((file) => isJSON(file) && !blacklist.includes(file));
      resolve(jsonFiles);
    });
  });
};

var readJSON = function(filePaths, callback) {
  'use strict';
  filePaths.forEach(function(filepath, data){
      let file = path.resolve(__dirname, filepath);
      console.log()
      fs.readFile(file, 'utf-8', function(err, data){
        callback(data, file);
      });
  });
};

var transformToArray = function(file, filepath, cb) {
  var values = [];
  var whitelist = [
    "menuLabel",
    "title",
    "body",

  ];
  function iterate(obj) {
    for (var prop in obj) {
      if (obj.hasOwnProperty(prop)) {
        if (typeof obj[prop] == "object") {
          iterate(obj[prop]);
        } else {
          if (whitelist.includes(prop)){
            values.push(obj[prop]);
          }
        }
      }
    }
  }
  iterate(file);

  // strip html tags
  values = sanitizeValues(values);

  cb(values);
};

var transformToObject = function(arr, filepath) {
  obj = arr.reduce(function(prev, curr, index){
    prev[curr] = "";
    return prev;
  }, {});
  saveFile(obj, filepath);
};

var saveFile = function(obj, filepath){
  var filename = filepath.split('/').pop();
  var domain   = filename.split('-')[0];
  var fullpath = translationDir + filename;

  mkdirp(translationDir, function(err){
    if (err) throw err;
  });

  fs.writeFile(fullpath, JSON.stringify(obj, null, 2) , 'utf-8', () => {
    convertFile(domain, filepath, fullpath);
  });
};

var convertFile = function(domain, filepath) {
  var file = filepath.split('/').pop();
  var jsonToPo = (file.substr(0, file.lastIndexOf(".")) + ".po");
  var source = translationDir + file;
  var target = translationDir + jsonToPo.split('/').pop();

  converter.i18nextToGettext(domain, source, target);
};

getJSONFiles()
  .then(function(filePaths){
    readJSON(filePaths, function(fileData, filepath) {
      transformToArray(JSON.parse(fileData), filepath, function(transformedArray){
        transformToObject(transformedArray, filepath);
      });
    });
  });
