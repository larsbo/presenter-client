// Generated by CoffeeScript 1.4.0
(function() {
  var ImagePicker, ImagePickerOption, sanitized_options;

  jQuery.fn.extend({
    imagepicker: function(options) {
      if (options == null) {
        options = {};
      }
      return this.each(function() {
        var select;
        select = $(this);
        select.next("ul.image_picker_selector").remove();
        return select.data("picker", new ImagePicker(this, sanitized_options(options)));
      });
    }
  });

  sanitized_options = function(opts) {
    var default_options;
    default_options = {
      mode: "basic",
      hide_select: true,
      show_label: false
    };
    return jQuery.extend(default_options, opts);
  };

  ImagePicker = (function() {

    function ImagePicker(select_element, opts) {
      this.opts = opts != null ? opts : {};
      this.select = $(select_element);
      this.multiple = this.select.attr("multiple") === "multiple";
      this.build_and_append_picker();
    }

    ImagePicker.prototype.has_implicit_blanks = function() {
      var option;
      return ((function() {
        var _i, _len, _ref, _results;
        _ref = this.picker_options;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          option = _ref[_i];
          if (option.is_blank() && !option.has_image()) {
            _results.push(option);
          }
        }
        return _results;
      }).call(this)).length > 0;
    };

    ImagePicker.prototype.build_and_append_picker = function() {
      if (this.opts.hide_select) {
        this.select.hide();
      }
      this.select.change({
        picker: this
      }, function(event) {
        return event.data.picker.sync_picker_with_select();
      });
      if (this.picker != null) {
        this.picker.remove();
      }
      this.create_picker();
      this.select.after(this.picker);
      return this.sync_picker_with_select();
    };

    ImagePicker.prototype.sync_picker_with_select = function() {
      var option, _i, _len, _ref, _results;
      _ref = this.picker_options;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        option = _ref[_i];
        if (option.is_selected()) {
          _results.push(option.mark_as_selected());
        } else {
          _results.push(option.unmark_as_selected());
        }
      }
      return _results;
    };

    ImagePicker.prototype.create_picker = function() {
      var option, _i, _len, _ref;
      this.picker = $("<ul class='thumbnails image_picker_selector'></div>");
      this.picker_options = (function() {
        var _i, _len, _ref, _results;
        _ref = this.select.find("option");
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          option = _ref[_i];
          _results.push(new ImagePickerOption(option, this, this.opts));
        }
        return _results;
      }).call(this);
      _ref = this.picker_options;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        option = _ref[_i];
        if (!option.has_image()) {
          continue;
        }
        this.picker.append(option.node);
      }
      return this.picker;
    };

    return ImagePicker;

  })();

  ImagePickerOption = (function() {

    function ImagePickerOption(option_element, picker, opts) {
      this.picker = picker;
      this.opts = opts != null ? opts : {};
      this.option = $(option_element);
      this.create_node();
    }

    ImagePickerOption.prototype.has_image = function() {
      return this.option.data("img-src") != null;
    };

    ImagePickerOption.prototype.is_blank = function() {
      return !((this.value() != null) && this.value() !== "");
    };

    ImagePickerOption.prototype.is_selected = function() {
      var select_value;
      select_value = this.picker.select.val();
      if (this.picker.multiple) {
        return $.inArray(this.value(), select_value) >= 0;
      } else {
        return this.value() === select_value;
      }
    };

    ImagePickerOption.prototype.mark_as_selected = function() {
      return this.node.find(".thumbnail").addClass("selected");
    };

    ImagePickerOption.prototype.unmark_as_selected = function() {
      return this.node.find(".thumbnail").removeClass("selected");
    };

    ImagePickerOption.prototype.value = function() {
      return this.option.val();
    };

    ImagePickerOption.prototype.label = function() {
      if (this.option.data("img-label")) {
        return this.option.data("img-label");
      } else {
        return this.option.text();
      }
    };

    ImagePickerOption.prototype.create_node = function() {
      var image, thumbnail;
      this.node = $("<li/>");
      image = $("<img class='image_picker_image'/>");
      image.attr("src", this.option.data("img-src"));
      thumbnail = $("<div class='thumbnail'>");
      thumbnail.click({
        picker: this.picker,
        option: this
      }, function(event) {
        var option, picker;
        picker = event.data.picker;
        option = event.data.option;
        if (picker.multiple) {
          if ($.inArray(option.value(), picker.select.val()) >= 0) {
            option.option.prop("selected", false);
          } else {
            option.option.prop("selected", true);
          }
        } else {
          if (picker.has_implicit_blanks() && option.is_selected()) {
            picker.select.val("");
            picker.select.change();
          } else {
            picker.select.val(option.value());
            picker.select.change();
          }
        }
        return picker.sync_picker_with_select();
      });
      thumbnail.append(image);
      if (this.opts.show_label) {
        thumbnail.append($("<p/>").html(this.label()));
      }
      this.node.append(thumbnail);
      return this.node;
    };

    return ImagePickerOption;

  })();

}).call(this);
