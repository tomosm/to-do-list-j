$(function () {

  function isEmpty(val) {
    return val === undefined || val === null || val === '';
  }

  function toLocaleString(date) {
    return [
      date.getDate(),
      date.getMonth() + 1,
      date.getFullYear()
    ].join('/');
  }

  // from dd/mm/yy
  function toDateFromLocaleDateString(dateString) {
    if (!isEmpty(dateString)) {
      var dateAttrs = dateString.split('/');
      if (dateAttrs.length === 3) {
        return new Date(dateAttrs[2], dateAttrs[1] - 1, dateAttrs[0]);
      }
    }
    return null;
  }

  function getUniqueStr() {
    return new Date().getTime().toString(16) + Math.floor(1000 * Math.random()).toString(16);
  }

  function getTypeFromUI($ui) {
    var types = ['pending', 'inprogress', 'completed'];
    for (var i = 0, len = types.length; i < len; i++) {
      if ($ui.hasClass(types[i])) {
        return types[i]
      }
    }
    return null;
  }

  // storage class
  // [{
  //   id: '157e17dc5d181' // Unique string
  //   type: 'pending', // Type identifying the category(pending/inprogress/completed)
  //   title: title,
  //   date: date, // Due date
  //   description: description
  //   createdAt : timestamp, // Created unix timestamp
  //   updatedAt : timestamp, // Updated unix timestamp
  // }, ...]
  function TodoStorage() {
    this.name = 'todoData';
    this.storage = localStorage;
  }

  TodoStorage.prototype.load = function () {
    var data = JSON.parse(this.storage.getItem(this.name));
    return data || [];
  };
  TodoStorage.prototype.save = function (data) {
    this.storage.setItem(this.name, JSON.stringify(data));
  };
  TodoStorage.prototype.clear = function () {
    this.storage.removeItem(this.name);
  };
  TodoStorage.prototype.saveTask = function (task) {
    var data = this.load();
    data.push(task);
    this.save(data);
  };
  TodoStorage.prototype._doToTask = function (id, func) {
    var data = this.load();
    for (var i = 0, len = data.length; i < len; i++) {
      if (data[i].id === id) {
        func(data, i);
        break;
      }
    }
    this.save(data);
  };
  TodoStorage.prototype.updateTaskType = function (id, type) {
    if (type === null) return;
    this._doToTask(id, function (data, index) {
      data[index].type = type;
      var task = data.splice(index, 1);
      data.push(task[0]);
    });
  };
  TodoStorage.prototype.deleteTask = function (id) {
    this._doToTask(id, function (data, index) {
      data.splice(index, 1); // delete
    });
  };

  // main view class
  function TodoBoardView() {
    // add jquery ui
    $('input.date').datepicker({
      dateFormat: 'dd/mm/yy'
    });
    $('input[type=button]').button();

    this.todoStorage = new TodoStorage();
    this._initializeEvents();

    this.loadFromStorage();
  }

  TodoBoardView.prototype._initializeEvents = function () {
    var self = this;

    var $todo = $('.todo');
    var $todoActions = $todo.filter('.actions');
    $todoActions.on('click', 'input[type=button].add-task', function () {
      var $dummyForm = $(this).parent();
      var $inputTitle = $dummyForm.find('input[type=text].title');
      var title = $inputTitle.val();
      if (isEmpty(title)) {
        $('<div title="Message"><p>Title can not be empty</p></div>').dialog({
          buttons: [
            {
              text: 'OK',
              click: function () {
                $(this).dialog('close');
              }
            }
          ]
        });
        return;
      }
      var $inputDate = $dummyForm.find('input[type=text].date');
      var date = $inputDate.val();
      var $textAreaDescription = $dummyForm.find('textarea.description');
      var description = $textAreaDescription.val();
      var createdAt = Date.now();
      var task = {
        id: getUniqueStr(),
        type: 'pending',
        title: title,
        date: toDateFromLocaleDateString(date),
        description: description,
        createdAt: createdAt,
        updateAt: createdAt
      };

      self._showTaskView(task);
      self.todoStorage.saveTask(task);
      $inputTitle.val('');
      $inputDate.val('');
      $textAreaDescription.val('');
    });

    $todoActions.on('click', 'input[type=button].clear-data', function () {
      self.todoStorage.clear();
      self.loadFromStorage();
    });

    var $todoDroppable = $todo.filter('.droppable');
    $todoDroppable.droppable({
      accept: '.task',
      // tolerance: 'fit',
      drop: function (_, ui) {
        $('.task-delete').hide();
        var $draggable = $(ui.draggable);
        $draggable.remove();
        self.todoStorage.updateTaskType($draggable.attr('id'), getTypeFromUI($(this)));
        self.loadFromStorage();
      }
    });

    $('.droppable.task-delete').droppable({
      accept: '.task',
      // tolerance: 'fit',
      drop: function (_, ui) {
        $(this).hide();
        var $draggable = $(ui.draggable);
        $draggable.remove();
        self.todoStorage.deleteTask($draggable.attr('id'));
      }
    });

  };

  TodoBoardView.prototype._showTaskView = function (task) {
    // show on one of todos
    if (!isEmpty(task.type)) {
      var $task = $('<div class="task"></div>');
      $task.attr('id', task.id);

      var $taskTitle = $('<h4></h4>');
      $taskTitle.text(task.title);
      $taskTitle.appendTo($task);

      if (!isEmpty(task.date)) {
        var $taskDate = $('<div class="date"></div>');
        $taskDate.text(toLocaleString(new Date(task.date)));
        $taskDate.appendTo($task);
      }

      if (!isEmpty(task.description)) {
        var $taskDescription = $('<p></p>');
        $taskDescription.text(task.description);
        $taskDescription.appendTo($task);
      }

      $task.appendTo('.todo.' + task.type);

      $task.draggable({
        revert: true,
        cursor: 'crosshair',
        // snap: '.droppable',
        // cancel: '.title',
        // helper: 'clone',
        // opacity: 0.35,
        // classes: {
        //   'ui-draggable': 'highlight'
        // }
        start: function () {
          $('.task-delete').show();
        },
        stop: function () {
          $('.task-delete').hide();
        }
      });
    }
  };

  TodoBoardView.prototype.loadFromStorage = function () {
    $('.todo .task').remove();
    var self = this;
    this.todoStorage.load().forEach(function (task) {
      self._showTaskView(task);
    });
  };

  // initialize
  new TodoBoardView();

});//]]>
