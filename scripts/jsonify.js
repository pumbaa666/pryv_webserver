function jsonify(form_name)
{
	var form = document.getElementById(form_name);
	var inputs = form.getElementsByTagName("input");
	var hidden_field; // Will store the whole json object
	var js_object = new Object();
	var array = []; // Store array values (if any). Arrays are identified as NAME#NUMBER

	for(var i = 0; i < inputs.length; i++) {
		var input = inputs[i];
		if(input.type == 'submit') // Ignore submit buttons
			continue;
		if(input.type == 'hidden') { // Ignore hidden fields. Will be used to store json representation of the object
			hidden_field = input;
			continue;
		}
		
		if(!input.value || input.value == '') // Ignore empty fields
			continue;

		var name = input.name;
		var value = input.value;

		if(name.indexOf('#') > -1) { // Arrays are named array#0, array#1 etc. Push the value in the array and do not store the array right now
			array.push(value);
			continue;
		}

		js_object[name] = value;
	};
	if(array.length > 0)
		js_object.data = array;
	
	hidden_field.value = JSON.stringify(js_object);
}
