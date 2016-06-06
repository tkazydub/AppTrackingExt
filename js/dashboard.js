function getListDataFromLocalStoragePromise(){
	return new Promise(function(resolve, reject){
		chrome.storage.sync.get({
			jiraFilter: []
		}, function(list_data){
			if (list_data.jiraFilter.length > 0){
				resolve(JSON.parse(list_data.jiraFilter));
		}
		else {
			resolve([]);
		}
		});
	});
}

function searchRequestJiraPromise(data) {
	return new Promise(function(resolve,reject){
		var xhr = new XMLHttpRequest();
		xhr.open("GET", $host + "/rest/api/2/search?jql=" + data['search_url'], true);
		xhr.onload = function() {
			if (xhr.status==200) {
				data["response"] = JSON.parse(xhr.response)
				resolve(data);
			}
			else {
				reject(xhr.status);
			}
		}
		xhr.send();
	});	
}

function getSearchData(){
	getListDataFromLocalStoragePromise().then(function(data){
		for (var i=0; i<data.length; i++){
			
			searchRequestJiraPromise(data[i]).then(function(response){
				generateFilter(response);
			});
		}
	});
}


function getStorageDataPromise(){
	return new Promise(function(resolve){
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

function initializeDashboard() {
	$('.list-container .list').remove();
	getStorageDataPromise().then(
	function(){
		getSearchData();
	});
}

function generateFilter(data) {
	var issues = data['response']['issues'];
	var newList = $('.list-template').clone().attr('class','list');
	newList.find('div.list-header').attr('href','#collapse'+data['id']);
	newList.find('div.collapse').attr('id','collapse'+data['id']);
	newList.find('div.list-header').text(data["name"]);
	if (issues.length>0){
		for (var i=0; i<issues.length; i++){
			newLine = newList.find('tbody tr:last').clone()
				.find('td[name="key"]').html('<a href="' + $host + '/browse/' + issues[i]["key"] + '">'+ issues[i]["key"] + '</a>').end()
				.find('td[name="summary"]').text(issues[i]["fields"]["summary"]).end()
				.find('td[name="status"]').text(issues[i]["fields"]["status"]["name"]).end();
			newList.find('tbody tr:last').after(newLine);
		}
		newList.find('tbody tr:first').remove();
	}
	else {
		newList.find('table').remove()
		newList.find('div.collapse .list-body').append('<div class="no-results-text">No issues found</div>');
	}	
	for (var i=0; i< data['params'].length; i++){
			newList.find('.panel-footer ul').append('<li><b>' + data['params'][i]['key']+ '</b> <b>' + data['params'][i]['equal'] + '</b> ' + data['params'][i]['value'] +'</li>')
		}
	$('.list-container').append(newList);
	

}