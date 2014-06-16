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
    return !isNaN(Date.parse(value));
  }

  var getType = function(value) {
    if (value.indexOf('%') >= 0) {
      // Chrome stupid bug. new Date('1%') returns a date
      return STRING_TYPE
    } else if (isNumber(value)) {
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

  var parseCSV = function(csvText) {

    var lines = csvText.split('\n');    // Get the lines of CSV
    var structure = [], data = [];
    
    // Get the headers
    var headers = lines[0].split(',');
    for (var i = 0; i < headers.length; i++) {
      structure.push({id: headers[i], type: STRING_TYPE});
    }

    // Get data
    var validCSV = true;
    for (var i = 1; i < lines.length && validCSV; i++) {

      //Avoid empty lines
      if (lines[i] !== '') { 
        var lineParsed = lines[i].split(',');

        // The header line should contain the same number of elements
        // that the rest of file lines. Comma when the last element is 
        // empty can be obviated. 
        if (lineParsed.length == headers.length || lineParsed.length + 1 == headers.length) {
          var row = {}
          for (var j = 0; j < lineParsed.length; j++) {
            row[headers[j]] = lineParsed[j];
          }
          data.push(row);
        } else {
          showError('Invalid CSV uploaded. Line ' + (i + 1) + '. Expected ' + headers.length + 
              ' fields but ' + lineParsed.length + ' were found.');
          validCSV = false;
        }
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
          var type = getType(data[j][fieldName]);
          if (type !== firstType) {
            sameType = false;
          }
        }

        // If all the elements have the same type, the column type
        // will be overwritten with this new type
        if (sameType) {
          structure[i].type = firstType;
        }
      }

    }

    // Information is only pushed when the CSV is valid
    if (validCSV) {
      var resource = {
        structure: structure,
        data: data
      };

      MashupPlatform.wiring.pushEvent('resource', JSON.stringify(resource));  
    }
  }


  ////////////////////////////////
  // HANDLER - ON FILE SELECTED //
  ////////////////////////////////

  var readFile = function(evt) {
    
    var fileName = evt.target.files[0];

    hideError();

    if (fileName) {
      var reader = new FileReader();
      reader.onload = function(e) {
        var content = e.target.result;
        parseCSV(content);
      }

      reader.readAsText(fileName);

    } else {
      showError('Empty file');
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