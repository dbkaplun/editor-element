var _ = require('lodash');

var util = require('slap-util');
var editorWidgetOpts = require('./opts');

var Editor = require('./Editor');

function Field (opts) {
  var self = this;

  if (!(self instanceof Field)) return new Field(opts);

  Editor.call(self, _.merge({
    height: 1,
    multiLine: false,
    history: false,
    historyCounter: -1,
    historyDirtyValue: '',
    historyValues: []
  }, editorWidgetOpts.field, opts));
  self.language(false);
}
Field.prototype.__proto__ = Editor.prototype;

Field.prototype.value = function (value) {
  // This accessor is a façade for the implementation using textBuf.
  var self = this;
  if (arguments.length) {
    self.textBuf.setText(value);
    return self;
  }
  return self.textBuf.getText();
};

Field.prototype.submit = function (value) {
  var self = this;
  if (self.options.history) {
    self.addToHistory(value);
    self.options.historyDirtyValue = '';
    self.options.historyCounter = -1;
  }
  self.emit('submit', value);
};

Field.prototype.cancel = function () { this.emit('cancel'); }
Field.prototype._initHandlers = function () {
  var self = this;
  self.on('blur', function () {
    self.options.historyCounter = -1;
  });
  self.on('keypress', function (ch, key) {
    switch (self.resolveBinding(key)) {
      case 'historyForward': if (self.options.history) self.goForwardInHistory(); return false;
      case 'historyBack': if (self.options.history) self.goBackInHistory(); return false;
      case 'submit': self.submit(self.value()); return false;
      case 'cancel': self.cancel(); return false;
    };
  });
  return Editor.prototype._initHandlers.apply(self, arguments);
};

Field.prototype.addToHistory = function (value) {
  var self = this;
  if (value) {
    var h = self.options.historyValues;
    if (h.length >= self.options.history.maxLength) {
      h.pop();
    }
    h.unshift(value);
  }
  return self;
};

Field.prototype.getHistory = function () {
  return this.options.historyValues;
};

Field.prototype.goBackInHistory = function () {
  var self = this;
/*
  when you press up,
  determine if the counter can be incremented.
  if it can:
    if the current counter is -1, the input is dirty;
    otherwise:
      get the corresponding item.
      determine if the input is dirty.
    if you have a dirty input, save it for later.
    increment the counter, get the corresponding item, and replace the visible text.
  otherwise, do nothing.
*/
  var currentHistoryCounter = self.options.historyCounter;
  var currentHistory = self.getHistory();

  if (currentHistoryCounter + 1 >= currentHistory.length) {
    // The counter cannot be incremented
    return;
  } else {
    var currentValue = self.value();

    if (currentHistoryCounter == -1) {
      self.options.historyDirtyValue = currentValue;
    } else {
      var comparison = currentHistory[currentHistoryCounter];

      if (currentValue !== comparison) {
        self.options.historyDirtyValue = currentValue
      }
    }

    self.value(currentHistory[++self.options.historyCounter]);

    return self;
  }
};

Field.prototype.goForwardInHistory = function () {
  var self = this;
/*
  when you press down
  if the counter is -1, do nothing.
  otherwise:
    look at the current counter, and get the corresponding item.
    If the counter is -1
      do nothing.
    decrement the counter.
    determine if the input is dirty.
    if you have a dirty input, save it for later.
    otherwise, get the corresponding item, and replace the visible text.
*/
  var currentHistoryCounter = self.options.historyCounter;

  if (currentHistoryCounter == -1) {
    // The counter cannot be decremented
    return;
  } else {
    var currentHistory = self.getHistory();
    var currentValue = self.value();
    var comparison = currentHistory[currentHistoryCounter];

    if (currentValue !== comparison) {
      self.options.historyDirtyValue = currentValue;
    }

    --self.options.historyCounter
    var replacement = currentHistoryCounter > 0 ? currentHistory[self.options.historyCounter] : self.options.historyDirtyValue;
    if ( typeof(replacement) !== typeof(undefined) ) {
      self.value(replacement);
    }

    return self;
  }
};

module.exports = Field;
