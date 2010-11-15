jQuery Dynamic Forms
====================

Plugin to dynamically create forms. The plugin has been originally designed to run on the server (in Node.js, using [express-jsdom](http://github.com/fgnass/express-jsdom)), but of course works perfectly well in the browser, too.

![Screenshot](https://github.com/downloads/fgnass/fgnass.github.com/dynaform.png)

## Usage

    $('#elem').dynaform(data, setup)

Creates form elements as specified by the setup function and appends them to the matched element.

## The Setup-Function

	$('#elem').dynaform(data, function() {
		this.text('name')
			.text('email', { required: true })
			.list('links', function() {
				this.text();
			});
	});

The *this* object has a method for each available widget, i.e. the built-in widgets as well as the custom ones.

All these methods take up to three arguments (depending on their type and context):

 1. The name of the property to which the element is bound.
 2. Element-specific settings.
 3. A setup function for list-elements or nested objects. 

## Common Widget Options

The following options can be used for all widgets:

 * **label** Allows you to specify a custom label, useful for i18n. If omitted, the property-name, to which the element is bound, is passed to `$.dynaform.naming.label()`.
 * **required** Marks the element as required.

## Built-In Widgets

### text

A simple textfield. Currently only the common options are supported.

### textarea

A simple textfield. Currently only the common options are supported.

### datepicker

A jQuery UI [datepicker](http://jqueryui.com/demos/datepicker/). All options are passed verbatim to the jQuery UI widget.

### checkbox

A simple ckeckbox. Options:

 * **checkedValue** The value submitted to the server when the checkbox is checked, i.e. the value-attribute of the input tag.

### nested

A nested form. Example:

    this.nested('address', function() {
		this.text('street')
			.text('city');
	});

### list

A list editor. Options:

 * **moveButtons** Whether to show move up/down buttons. Default is *true*.
 * **dragAndDrop** Whether the items can be re-ordered using drag and drop. Default is *true*.
 
### upload

## Registering Custom Widgets

You can register your own widgets via `$.dynaform.register(builders)`. Here's an example of a simple password field:

    $.dynaform.register({
		password: function(options) {
			return $('<input type="password">')
				.attr('name', options.name)
				.attr('value', options.value);
		}
	});

When a builder method is invoked, an options object is passed with the following properties:

* **name** The parameter name to use.
* **value** The current value
* **id** A unique id
* **nested** A nested setup-function.
* **...** Your custom options.

## Naming Strategies

You may change the way how parameter names, ids, or labels are created, by overwriting any of the `$.dynaform.naming` functions.

## Overwriting Built-In Widgets

If you register a widget with a name that already exists, the original implementation is passed to your builder-function as second argument. Here's an example that support for the `rows` attribute to the default textarea implementation:

	$.dynaform.register({
		textarea: function(options, textarea) {
			return textarea(options).attr('rows', options.rows || 5);
		}
	});
