(function () {

  'use strict';

  var layout, error;

  var STRING_TYPE = 'string';
  var NUMBER_TYPE = 'number';
  var DATE_TYPE = 'date';

  ///////////
  // ERROR //
  ///////////

  var showError = function(errorMsg) {
    error.innerHTML = errorMsg;
    $(error).removeClass('hidden');
  }

  var hideError = function(e) {
    $(error).addClass('hidden');
  }


  //////////////
  // AUXILIAR //
  //////////////

  var isNumber = function(value) {
    return !isNaN(Number(value));
  }

  var isDate = function(value) {
    return Date.parse(value) !== null;
  }

  var getType = function(value) {
    if (isNumber(value)) {
      return NUMBER_TYPE;
    } else if (isDate(value)) {
      return DATE_TYPE;
    } else {
      return STRING_TYPE;
    }
  }


  ///////////////
  // PARSE CSV //
  ///////////////

  /*
   * Extracted from:
   * http://www.bennadel.com/blog/1504-ask-ben-parsing-csv-strings-with-javascript-exec-regular-expression-command.htm
   */
  function CSVToArray(strData, strDelimiter){
    // Check to see if the delimiter is defined. If not, then default to comma.
    strDelimiter = strDelimiter || ",";

    // Create a regular expression to parse the CSV values.
    var objPattern = new RegExp(
      (
        // Delimiters.
        "(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +

        // Quoted fields.
        "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +

        // Standard fields.
        "([^\"\\" + strDelimiter + "\\r\\n]*))"
      ),
      "gi"
    );


    // Create an array to hold our data. Give the array a default empty first row.
    var arrData = [[]];

    // Create an array to hold our individual pattern matching groups.
    var arrMatches = null;

    // Keep looping over the regular expression matches until we can no longer find a match.
    while (arrMatches = objPattern.exec(strData)){

      // Get the delimiter that was found.
      var strMatchedDelimiter = arrMatches[1];

      // Check to see if the given delimiter has a length (is not the start of string) and if it matches
      // field delimiter. If id does not, then we know that this delimiter is a row delimiter.
      if (strMatchedDelimiter.length && (strMatchedDelimiter != strDelimiter)){
        // Since we have reached a new row of data, add an empty row to our data array.
        arrData.push([]);
      }

      // Now that we have our delimiter out of the way, et's check to see which kind of value we
      // captured (quoted or unquoted).
      if (arrMatches[2]){
        // We found a quoted value. When we capture this value, unescape any double quotes.
        var strMatchedValue = arrMatches[2].replace(new RegExp("\"\"", "g"),"\"");
      } else {
        // We found a non-quoted value.
        var strMatchedValue = arrMatches[3];
      }

      // Now that we have our value string, let's add it to the data array.
      arrData[arrData.length - 1].push(strMatchedValue);
    }

    // Return the parsed data.
    return arrData;
  }

  var parseCSV = function(csvText) {

    var csvAsArray = CSVToArray(csvText);
    var headers = csvAsArray[0];
    var structure = [], data = [];

    // Headers
    for (var i = 0; i < headers.length; i++) {
      structure.push({id: headers[i], type: STRING_TYPE});
    }

    // Data
    for (var i = 1; i < csvAsArray.length; i++) {
      var aux = csvAsArray[i];
      var emptyLine = (aux.length == 1) && (aux[0] == '');
      
      // Avoid including empty lines
      if (!emptyLine) {
        var record = {};
        for (var j = 0; j < headers.length; j++) {
          record[headers[j]] = aux[j] || '';
        }

        //Push the record in the data array
        data.push(record);
      }
    }

    // Infer data types
    for (var i = 0; i < structure.length; i++) {

      var fieldName = structure[i].id;
      var sameType = true;
      var firstType = getType(data[0][fieldName]);

      //By default, the type is string
      if (firstType !== STRING_TYPE) {
        // All the elements of that column should have the same time.
        // Otherwise, the type will be considered as string.
        for (var j = 1; j < data.length && sameType; j++) {
          // Empty fields should not be checked, since they are always
          // considered as numbers.
          if (data[j][fieldName] != '') {
            var type = getType(data[j][fieldName]);
            if (type !== firstType) {
              sameType = false;
            }
          }
        }

        // If all the elements have the same type, the column type
        // will be overwritten with this new type
        if (sameType) {
          structure[i].type = firstType;
        }
      }
    }

    // Date fields should be parsed
    for (var i = 0; i < structure.length; i++) {
      var field = structure[i];

      if (field.type === DATE_TYPE) {
        for (var j = 0; j < data.length; j++) {
          // new Date is from JS core
          // Date is from the Date libary imported
          if (data[j][field.id] !== '') {
            data[j][field.id] = Date.parse(data[j][field.id]).toISOString();
          }
        }
      }
    }

    var resource = {
      structure: structure,
      data: data
    };

    MashupPlatform.wiring.pushEvent('resource', JSON.stringify(resource));
  }


  ////////////////////////////////
  // HANDLER - ON FILE SELECTED //
  ////////////////////////////////

  var readFile = function(evt) {
    
    var file = evt.target.files[0];

    hideError();

    if (file && file.type === 'text/csv') {
      var reader = new FileReader();
      reader.onload = function(e) {
        var content = e.target.result;
        parseCSV(content);
      }

      reader.readAsText(file);
    } else if (file) {
      showError('Invalid format. text/csv was expected, but ' + file.type + ' was found');
    } else {
      showError('Please, select a valid file');
    }
  }


  /////////////////////////////////
  // CREATE THE GRAPHIC ELEMENTS //
  /////////////////////////////////

  var init = function() {

    layout = new StyledElements.BorderLayout();
    layout.insertInto(document.body);

    //Create the resource title
    var info_msg = document.createElement('p');
    info_msg.innerHTML = 'Upload the CSV File';
    layout.getCenterContainer().appendChild(info_msg);

    //Create the resource select
    var input_file = document.createElement('input');
    input_file.setAttribute('type', 'file');
    input_file.addEventListener('change', readFile);
    layout.getCenterContainer().appendChild(input_file);

    //Create the error div
    error = document.createElement('div');
    error.setAttribute('class', 'alert alert-danger');
    hideError();
    layout.getCenterContainer().appendChild(error);

    //Repaint is needed
    layout.repaint();

    MashupPlatform.widget.context.registerCallback(function (changes) {
      if ('widthInPixels' in changes || 'heightInPixels' in changes) {
        layout.repaint();
      }
    });
  }

  //Start the execution when the DOM is enterely loaded
  document.addEventListener('DOMContentLoaded', init.bind(this), true);

})();