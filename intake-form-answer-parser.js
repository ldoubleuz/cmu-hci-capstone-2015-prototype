module.exports = {
    parse: parseIntakeFormAnswers
};

function parseIntakeFormAnswers(formBody) {
  var answers = {};
  for (var key in formBody) {
    var parts = key.split('__'),
        questionId,
        textOptionId;

    if (parts.length === 1) {
      questionId = key;
      answers[questionId] = formBody[key];
    }

    else if (parts[0] === 'TEXTOPTION') {
      questionId = parts[1];
      textOptionId = parts[2];
      if (formBody[questionId] === textOptionId) {
        answers[questionId] = formBody[key];
      }
    }
    // TODO: Fill out for dynamic row questions
//    else {
//      questionId = parts[0];
//      if (answers[questionId] === undefined) {
//        answers[questionId] = {};
//      }
//      answers[questionId][]
//    }
  }
}
