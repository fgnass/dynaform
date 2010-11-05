(function ($) {

	var DynaForm = function (form, data, prefix) {
		this.form = form;
		this.data = data;
		this.prefix = prefix;
	};
	DynaForm.prototype.builders = {};
	
	$.dynaform = {
		naming: {
			/**
			 * Creates a parameter-name for a possibly nested element.
			 */
			param: function(parent, name) {
				return parent ? parent + '.' + name : name;
			},
			/**
			 * Creates a parameter-name for a list-item.
			 */
			arrayItem: function(name, index) {
				return name + '[' + index + ']';
			},
			/**
			 * Converts a parameter name into a string that can be used as element id.
			 * contact.address[0] -> contactaddress5B05D
			 */
			id: function(name) {
				return escape(name).replace(/\W/g, '');
			},
			/**
			 * Converts a property name into a human-friendly label.
			 * firstName -> First Name
			 */
			label: function(prop) {
				return prop.replace(/([A-Z][a-z])/g, ' $1')
					.replace(/([a-z])([A-Z])/g, '$1 $2')
					.replace(/([\D\S])(\d)/g,'$1 $2')
					.replace(/^(.)/, function (s) { 
						return s.toUpperCase();
					});
			}
		},
		validatorSettings: {
			errorPlacement: function(label, el) {
				var c = el.closest('.labeled,li').find('.errors');
				if (!c.length) {
					c = $('<span>').addClass('errors').insertAfter(el);
				}
				if (!c.is('.error-tooltip')) {
					c.wrap('<span class="error-tooltip">');
				}
				label.appendTo(c);
			},
			wrapper: 'b'
		},
		
		register: function (builders) {
			// Add raw builders to prototype.builders
			$.extend(DynaForm.prototype.builders, builders);
			
			$.each(builders, function (type, builder) {
				var prev = DynaForm.prototype[type];
				DynaForm.prototype[type] = function () {
					var args = $.makeArray(arguments),
						shift = function (type) {
							if (typeof args[0] === type) {
								return args.shift();
							}
						},
						bind = shift('string'),
						options = shift('object') || {},
						nested = shift('function'),
						name = $.dynaform.naming.param(this.prefix, bind);
						
					options = $.extend({
							label: options.label || options.label !== false && bind && $.dynaform.naming.label(bind),
							nested: nested
						}, 
						options, {
							name: name,
							id: $.dynaform.naming.id(name),
							value: bind && this.data ? this.data[bind] : this.data
						}
					);
					var el = builder.call(this, options, prev).addClass(type);
					
					if (options.label) {
						el = $('<div class="labeled">')
							.append($('<label class="name">').text(options.label))
							.append($('<div class="element">').append(el));
					}
					this.form.append(el);
					return this;
				};
			});
		}
	};

	$.fn.dynaform = function (data, builder) {
		builder.call(new DynaForm(this, data));
		var s = $.dynaform.validatorSettings;
		if ($.validator && s) {
			this.closest('form').validate(s);
		}
		return this;
	};

	$.dynaform.register({
		text: function (options) {
			return $('<input type="text" class="text">')
				.attr('name', options.name)
				.attr('value', options.value || '')
				.toggleClass('required', !!options.required);
		},
		textarea: function (options) {
			return $('<textarea>')
				.attr('name', options.name)
				.toggleClass('required', !!options.required)
				.append(options.value);
		},
		datepicker: function (options) {
			return this.builders.text(options).datepicker($.extend({
				showAnim: false,
				onSelect: function() {
					$(this).trigger('focusout'); //triggers validation
				}
			}, options));
		},
		checkbox: function (options) {
			var cb = $('<input type="checkbox" class="checkbox">')
				.attr('name', options.name)
				.attr('value', 'on')
				.attr('id', options.id);
			
			cb.get(0).checked = !!options.value;
			var label = $('<label class="name">').attr('for', options.id).text(options.label);
			options.label = false;
			
			return $('<div class="labeled">').append(label).append(cb);
		},
		nested: function (options) {
			var el = $('<div class="nested">');
			options.nested.call(new DynaForm(el, options.value, options.name));
			return el;
		},
		button: function (options) {
			var el = $('<input type="submit">')
				.addClass('button cancel')
				.toggleClass('image-button', options.icon && !options.label)
				.click(function (ev) {
					options.click.call(this, ev);
					return false;
				});
			if (options.label) {
				el.attr('value', options.label);
			}
			if (options.icon) {
				el.addClass(options.icon);
			}
			return el;
		},
		list: function (options) {
			var el = $('<div>'),
				items = $('<ul>').appendTo(el),
				self = this;
			
			function addItem(i, value) {
				var li = $('<li>').appendTo(items),
					item = $('<span>').addClass('item').appendTo(li),
					name = $.dynaform.naming.arrayItem(options.name, i);
			
				if (options.moveButtons !== false) {
					item.append(self.builders.button({icon: 'up', click: function () {
						var prev = li.prev();
						if (prev) {
							li.insertBefore(prev);
						}
					}}));
					item.append(self.builders.button({icon: 'down', click: function () {
						var next = li.next();
						if (next) {
							li.insertAfter(next);
						}
					}}));
				}
				if (options.dragAndDrop !== false) {
					item.addClass('draggable');
				}
				options.nested.call(new DynaForm($('<span>').addClass('itemElement').appendTo(item), value, name));
			
				item.append(self.builders.button({icon: 'remove', click: function () {
					li.remove();
				}}));
				li.append('<span class="errors">');
			}
			if (options.value) {
				$.each(options.value, addItem);
			}
		
			if (options.dragAndDrop) {
				items.sortable({
					axis: 'y',
					handle: '.item'
				});
			}
		
			el.append(this.builders.button({icon: 'add', click: function () {
				addItem(items.children().size(), null);
			}}));
			return el;
		},
		upload: function (options) {
			return $('<input type="file" multiple="multiple">').attr('name', options.name);
		}
	});

	// If both validator and datepicker are present, add a new method that checks if the date is valid,
	// using the datepicker's parseDate function.
	if ($.validator && $.datepicker) {
		$.validator.addMethod('datepicker',
			function(value, element, params) {
				var format = $(element).datepicker('option', 'dateFormat');
				try {
					$.datepicker.parseDate(format, value);
					return true;
				}
				catch (err) {
					return false;
				}
			}, 
			'Invalid date.'
		);
		
		$.validator.addClassRules('datepicker', {
			datepicker: true
		});
	}

})(jQuery);