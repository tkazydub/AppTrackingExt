(function($) {
  		$(document).ready(function(){
  			// removeLocalStorage();
  			initializeDashboard();
  			insertCredentialsData();
  			createFiltersFromData();
  			$(document)
  				.on('click', '.create-new-filter', function(){
  					var lastFilter = $(".filter:last");
  					try {
  						var new_id = parseInt(lastFilter.prop('id').match(/\d+/g)[0],10) +1;
  					}
  					catch(err) {
  						var new_id = 1;
  					}
  					var newFilter = $('.filter-template').clone().attr('id','jira-filter-'+new_id).attr('class','filter');
  					newFilter.find('.header-settings span.edit-filter-icon').hide();
  					newFilter.find('.header-settings span.cancel-edit').hide();
  					newFilter.find('div.filter-search-query').hide();
  					if (lastFilter.length != 0) {
  						lastFilter.after(newFilter);
  					} else {
  						$('.create-new-filter').before(newFilter);
  					}
  				})
  				.on('click', '.remove-filter', function(){
  					var filter_id = parseInt($(this).closest('.filter').prop('id').match(/\d+/g)[0],10);
  					removeFilter(filter_id);
  				})
  				.on("click",'.remove-param',function(){
			  		var list_id = parseInt($(this).closest('.filter').prop("id").match(/\d+/g)[0],10);
			  		var count = $("#jira-filter-" + list_id + " .filter-params .input-group").length;
			  		$(this).closest('div').remove();
			  		count--;
			  		if (count < 2) $('#jira-filter-' + list_id + ' .filter-params .remove-param').attr('disabled','disabled');
			  	})
			  	.on('click', '.add-param', function() {
			  		var list_id = $(this).closest('.filter').prop('id').match(/\d+/g)[0];
			  		var count = $("#jira-filter-" + list_id + " .filter-params .input-group").length;
			  		var $input = $('#jira-filter-' + list_id + ' .filter-params .input-group:last');
			  		var $newParam = 
			  			$input.clone()
			  			.find('input[name="key"]').val("").end()
			  			.find('input[name="value"]').val("").end();
			  		$input.after($newParam);
			  		count++;
			  		if (count > 1) $('#jira-filter-' + list_id + ' .filter-params .remove-param').removeAttr('disabled');
			 	})
			 	.on('click', '.save-filter', function(){
			 		var list_id = $(this).closest('.filter').prop('id').match(/\d+/g)[0];
			 		if (checkIfFieldsAreEntered(list_id)){
			 			saveListDataToLocalStorage(list_id);
			 		}
			 	})
			 	.on('click', '.edit-filter-icon', function(){
			 		var list_id = $(this).closest('.filter').prop('id').match(/\d+/g)[0];
			 		makeFilterEditView(list_id);
			 	})
			 	.on('click','.cancel-edit', function(){
					var list_id = $(this).closest('.filter').prop('id').match(/\d+/g)[0];
			 		cancelEditFilterView(list_id);
			 	})
			 	.on('click', '#submit-jira-credentials', function(){
  					if (checkIfCredentialsEntered()){
  						saveJiraCredentials(readJiraCredentials());
  					}
  				})
  				.on('click', '#jira-credentials-edit', function(){
  					credentialsBlockEdit();
  				})
  				.on('click', '#jira-credentials-cancel', function(){
  					insertCredentialsData();
  				})
  				.on('click', '#navigateToDashboard', initializeDashboard)
  		});
}) (jQuery);

function getFilterData(filter_id) {
	var filter_name = $('#jira-filter-' + filter_id + ' .filter-header input').val()
	var params = [];
	$("#jira-filter-"+ filter_id + " .filter-params .input-group").each(function(){
		params.push({"key": $(this).find('input[name="key"]').val(), "value": $(this).find('input[name="value"]').val()});
	});
	var order_by = {
		"order_field": $("#jira-filter-"+ filter_id + " .filter-extra-params .input-group:first").find('input').val(),
		"sort_order": $("#jira-filter-"+ filter_id + " .filter-extra-params .input-group:first").find('select').val()
	};
	var max_size = $("#jira-filter-"+ filter_id + " .filter-extra-params .input-group:last").find('input').val();
	results_json = {"id": filter_id, "name": filter_name, "params": params, "maxSize": max_size, "orderBy": order_by}
	results_json["search_url"] = generateJiraSearchQuery(results_json);
	return results_json;
}		

function saveListDataToLocalStoragePromise(data) {
	return new Promise(function(resolve,reject){
		var list_data = JSON.stringify(data);
		chrome.storage.sync.set({
			jiraFilter: list_data
		}, function() {
			resolve();
		});
	});
}

function saveListDataToLocalStorage(list_id) {
	getListDataFromLocalStoragePromise().then(
		function(filter_data) {
			if (!(filter_data instanceof Array)) {
				filter_data = [getFilterData(list_id)];
			}
			else if (findFilterById(filter_data, list_id) == undefined) {
				filter_data.push(getFilterData(list_id));
			}
			else {
				var data_index = filter_data.indexOf(findFilterById(filter_data, list_id));
				filter_data[data_index] = getFilterData(list_id);
			}
			return filter_data;
		}).then(function(data){
			saveListDataToLocalStoragePromise(data).then(
				function(){
					console.log("data successfully saved");
					makeFilterDisplayView(list_id,getFilterData(list_id)['search_url']);
				}, function(){
					console.log("unable to save list data!");
				});
	});
}

function removeFilter(list_id){
	getListDataFromLocalStoragePromise().then(function(filter_data){
		var list_index = filter_data.indexOf(findFilterById(filter_data, list_id));
		if (list_index > -1){
			filter_data.splice(list_index,1);
		}
		return filter_data;
	}).then(function(data){
		saveListDataToLocalStoragePromise(data).then(function() {
			removeFilterFromUI(list_id);
		});
	});
}

function removeFilterFromUI(id){
	$('#jira-filter-'+id).remove();
}

function generateJiraSearchQuery(data){
	var params = data["params"];
	var result_query = ""
	for (var i=0; i<params.length; i++){
		if (i!=0) { result_query += "+AND+"};
		result_query += params[i]["key"] + "=" + params[i]["value"];
	}
	result_query += "+order+by+" + data["orderBy"]["order_field"] + "+" + data["orderBy"]["sort_order"] + "&maxResults=" + data["maxSize"] + "&fields=key,summary,status";
	return result_query
}


function findFilterById(filter_data, id){
	for(var i = 0; i < filter_data.length; i++)
	{
	  if(filter_data[i].id == id)
	  {
	    return filter_data[i];
	  }
	}
}

function createFiltersFromData(){
	getListDataFromLocalStoragePromise().then(
		function(data){
			if (data instanceof Array){
				if (data.length == 0){
					createEmptyFilterForm();
				}
				else {
					createJiraFilters(data);
				}
			}
			else {
				createEmptyFilterForm();
			}
	});
}

function createJiraFilters(data){
	for (var i=0; i<data.length; i++){
		var newFilter = $('.filter-template').clone().attr('id','jira-filter-'+data[i]['id']).attr('class','filter')
			.find('.filter-header input').val(data[i]['name']).end()
			.find('.filter-extra-params .input-group:first input').val(data[i]['orderBy']['order_field']).end()
			.find('.filter-extra-params .input-group:first select').val(data[i]['orderBy']['sort_order']).end()
			.find('.filter-extra-params .input-group:last input').val(data[i]['maxSize']).end();
		$('.filter-container').append(newFilter);	
		$('#jira-filter-'+ data[i]['id'] +' .filter-params .input-group:last').remove();
		for (var j=0; j<data[i]['params'].length; j++){
			if (j>0){
				var newParamsField = $('#jira-filter-'+ data[i]['id'] +' .filter-params .input-group:last').clone()
					.find('input[name="key"]').val("").end()
					.find('input[name="value"]').val("").end();
				$('#jira-filter-'+ data[i]['id'] +' .filter-params .input-group:last').after(newParamsField);
			};
			$('#jira-filter-'+ data[i]['id'] +' .filter-params .input-group:last input[name="key"]').val(data[i]['params'][j]['key']).end();
			$('#jira-filter-'+ data[i]['id'] +' .filter-params .input-group:last input[name="value"]').val(data[i]['params'][j]['value']).end();
			$('#jira-filter-'+ data[i]['id'] +' .filter-search-query .search-query-text').text(data[i]['search_url']).end();
		};
		makeFilterDisplayView(data[i]['id'], false);

	}
	insertAddNewFilterButton();
}

function createEmptyFilterForm(){
	var filterContainer = $(".filter-container");
  	var newFilter = $('.filter-template').clone().attr('id','jira-filter-1').attr('class','filter');
  	newFilter.find('.header-settings span.edit-filter-icon').hide();
  	newFilter.find('.header-settings span.cancel-edit').hide();
  	newFilter.find('.filter-search-query').hide();
  	filterContainer.append(newFilter);
  	insertAddNewFilterButton();
}
function insertAddNewFilterButton(){
	button = '<button class="create-new-filter">Create new filter</button>';
	$('.filter-container').append(button);
}


function makeFilterDisplayView(filter_id,search_query){
			$('#jira-filter-'+ filter_id + ' input').css('font-weight','bold');
			$('#jira-filter-'+ filter_id + ' input').prop('disabled', true);
			$('#jira-filter-'+ filter_id + ' select').prop('disabled', true);
			$('#jira-filter-'+ filter_id + ' .filter-params button').hide();
			$('#jira-filter-'+ filter_id + ' .header-settings span.edit-filter-icon').show();
			$('#jira-filter-'+ filter_id + ' .header-settings span.remove-filter').hide();
			$('#jira-filter-'+ filter_id + ' .header-settings span.cancel-edit').hide();
			$('#jira-filter-'+ filter_id + ' div.filter-search-query').show();
			$('#jira-filter-'+ filter_id + ' button.save-filter').hide();
			if (search_query) {
				$('#jira-filter-'+ filter_id + ' div.filter-search-query div.search-query-text').text(search_query);
			}
}

function makeFilterEditView(filter_id){
			$('#jira-filter-'+ filter_id + ' input').css('font-weight','normal');
			$('#jira-filter-'+ filter_id + ' input').prop('disabled', false);
			$('#jira-filter-'+ filter_id + ' select').prop('disabled', false);
			$('#jira-filter-'+ filter_id + ' .filter-params button').show();
			$('#jira-filter-'+ filter_id + ' .header-settings span.edit-filter-icon').hide();
			$('#jira-filter-'+ filter_id + ' .header-settings span.remove-filter').show();
			$('#jira-filter-'+ filter_id + ' .header-settings span.cancel-edit').show();
			$('#jira-filter-'+ filter_id + ' div.filter-search-query').hide();
			$('#jira-filter-'+ filter_id + ' button.save-filter').show();
}

function cancelEditFilterView(filter_id){
	getListDataFromLocalStoragePromise().then(
		function(filter_data){
			var list_index = filter_data.indexOf(findFilterById(filter_data, filter_id));
			buidCancelEditFilterView(filter_data[list_index]);
		});
		
}

function buidCancelEditFilterView(data){
	$('#jira-filter-'+data['id'])
		.find('.filter-header input').val(data['name']).end()
		.find('.filter-extra-params .input-group:first input').val(data['orderBy']['order_field']).end()
		.find('.filter-extra-params .input-group:first select').val(data['orderBy']['sort_order']).end()
		.find('.filter-extra-params .input-group:last input').val(data['maxSize']).end()
		.find('.filter-search-query .search-query-text').text(data['search_url']).end();
	
	params_len = $('#jira-filter-'+ data['id'] +' .filter-params .input-group').length;
	for (var i=0; i< params_len -1; i++){
		$('#jira-filter-'+ data['id'] +' .filter-params .input-group:last').remove();
	}	
	for (var j=0; j<data['params'].length; j++){
		if (j>0){
			var newParamsField = $('#jira-filter-'+ data['id'] +' .filter-params .input-group:last').clone()
				.find('input[name="key"]').val("").end()
				.find('input[name="value"]').val("").end();
			$('#jira-filter-'+ data['id'] +' .filter-params .input-group:last').after(newParamsField);
		};
		$('#jira-filter-'+ data['id'] +' .filter-params .input-group:last input[name="key"]').val(data['params'][j]['key']).end();
		$('#jira-filter-'+ data['id'] +' .filter-params .input-group:last input[name="value"]').val(data['params'][j]['value']).end();
	};
	makeFilterDisplayView(data['id'], false);
}

function checkIfFieldsAreEntered(filter_id){
	var allFieldsAreEntered = true;
	$('#jira-filter-'+ filter_id + ' input').each(function(){
		if ($(this).val()==''){
			$(this).css('border-color','red');
			allFieldsAreEntered = false;
		}
		else {
			$(this).css('border-color','black');
		}
	});
	return allFieldsAreEntered;
}

// For testing

function removeLocalStoragePromise(){
		return new Promise(function(resolve, reject){
		chrome.storage.sync.clear();
		resolve();
	});
}

function getStorageDataPromise(){
	return new Promise(function(resolve,reject){
		chrome.storage.sync.get({
		jiraHost: '',
		jiraUsername: '',
		jiraPassword: '',
		jiraFilter: []
	}, function(items) {
		$host = items.jiraHost;
		$username = items.jiraUsername;
		$password = items.jiraPassword;
		$jira_filter = items.jiraFilter;
  		resolve();
  	});
	});
}

function removeLocalStorage(){
	removeLocalStoragePromise().then(
		function() {
			console.log("data successfully removed!");
			getStorageDataPromise().then(function(){
			})
		});
}		

