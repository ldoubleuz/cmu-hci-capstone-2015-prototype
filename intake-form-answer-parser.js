module.exports = {
    parse: parseIntakeFormAnswers
};

function _buildFormBody(formFields) {
  var body = {};
  for (var i=0; i < formFields.length; i++) {
    var field = formFields[i];
    var key = field.name;
    var value = field.value;

    body[key] = value;
  }
  return body;
}

// formFields should be an array of {name:, value:} objects, as returned by
// jQuery's serializeArray
function parseIntakeFormAnswers(formFields) {
  var formBody = _buildFormBody(formFields);

  var answers = {};
  // We have to build up data for dynamic field options, then generate
  // an array of flattened row-strings
  var allDynamicFieldData = {}; 
  for (var key in formBody) {
    var value = formBody[key];

    var parts = key.split('__'),
        questionId,
        textOptionId,
        questionAnswer;

    if (parts.length === 1) {
      questionId = key;
      answers[questionId] = value;
    } else if (parts[0] === 'TEXTOPTION') {
      questionId = parts[1];
      textOptionId = parts[2];
      if (formBody[questionId] === textOptionId) {
        answers[questionId] = value;
      }
    } else if (parts[0] === 'DYNAMIC') {
      questionId = parts[1];
      var colId = parts[2];
      var rowNum = parseInt(parts[3]);
      var colNum = parseInt(parts[4]);

      /* Format:
         {
            <questionId>: {
              // Note that lastRowIndex is an _index_, not the number of rows
              lastRowIndex: Number, 
              lastColIndex: Number,
              gridContents: {
                <rowNum>: {
                  <colNum>: <field value>
                }
              }
            }
         }
       */

      if (!(questionId in allDynamicFieldData)) {
        allDynamicFieldData[questionId] = {
          lastRowIndex: -1,
          lastColIndex: -1,
          gridContents: {}
        };
      }
      var fieldMetadata = allDynamicFieldData[questionId];
      fieldMetadata.lastRowIndex = Math.max(fieldMetadata.lastRowIndex, rowNum);
      fieldMetadata.lastColIndex = Math.max(fieldMetadata.lastColIndex, colNum);

      var fieldGridContents = fieldMetadata.gridContents;

      if (!(rowNum in fieldGridContents)) {
        fieldGridContents[rowNum] = {};
      }
      var gridRow = fieldGridContents[rowNum];

      gridRow[colNum] = value;
    }
  }

  // Save into answers dict as 
  // <questionId>: [<flat string of row 0>, <flat string of row 1>, etc]
  for (var questionId in allDynamicFieldData) {
    var questionMetadata = allDynamicFieldData[questionId];
    var numRows = questionMetadata.lastRowIndex+1;
    var numCols = questionMetadata.lastColIndex+1;

    var answerArray = [];
    // Flatten each row into a single string
    for (var row=0; row < numRows; row++) {
      var rowMap = questionMetadata.gridContents[row] || {};
      var rowParts = [];
      for (var col=0; col < numCols; col++) {
        if (col in rowMap) {
          rowParts.push(rowMap[col]);
        }
      }
      answerArray.push(rowParts.join(' '));
    }
    // Finally, save array of rowstrings into actual answers map
    answers[questionId] = answerArray;
  }

  return answers;
}
