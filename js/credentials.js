function credentialsBlockDisplay(data) {
	$('#jira-host').val(data['host']),
	$('#jira-username').val(data['username']),
	$('#jira-password').val(data['password']);
	$('.credentials-container input').prop('disabled', true).css('font-weight', 'bold');
	$('#submit-jira-credentials').hide();
  	$('#jira-credentials-cancel').hide();
  	$('#jira-credentials-edit').show();
}

function credentialsBlockEdit(){
	$('.credentials-container input').prop('disabled', false).css('font-weight', 'normal');
	$('#submit-jira-credentials').show();
  	$('#jira-credentials-cancel').show();
  	$('#jira-credentials-edit').hide();	
}


function readJiraCredentials(){
	var host = $('#jira-host').val(),
		username = $('#jira-username').val(),
		password = $('#jira-password').val();
	return {'host': host, 'username': username, 'password': password};
}

function saveJiraSettingsPromise(data) {
	return new Promise(function(resolve,reject){
		chrome.storage.sync.set({
			jiraHost: data["host"],
			jiraUsername: data["username"],
			jiraPassword: data["password"]
		}, function(){
			resolve();
			var status = document.getElementById('status');
			status.textContent = 'Options saved!';
			setTimeout(function(){
				status.textContent = '';
			}, 750);
		});
	});	
}

function saveJiraCredentials(data){
	saveJiraSettingsPromise(data).then(function(){
		getJiraCredentialsPromise().then(function(storage_data){
			$storage_data = {"host":storage_data.jiraHost, "username":storage_data.jiraUsername, "password": storage_data.jiraPassword}
			credentialsBlockDisplay($storage_data);
		})
	})
}

function getJiraCredentialsPromise(){
	return new Promise(function(resolve,reject){
		chrome.storage.sync.get({
		jiraHost: '',
		jiraUsername: '',
		jiraPassword: ''
	}, function(items) {
		resolve(items);
	});
	});	
}

function insertCredentialsData(){
	getJiraCredentialsPromise().then(function(storage_data){
		$storage_data = {"host":storage_data.jiraHost, "username":storage_data.jiraUsername, "password": storage_data.jiraPassword}
		if ($storage_data["host"].length > 0 && $storage_data["username"].length > 0 && $storage_data["password"].length > 0) {
			credentialsBlockDisplay($storage_data);
		}
		else{
			credentialsBlockEdit();
		}	
	},
	function(){
		console.log("Unable to get Chrome local storage!");
	});
}

function checkIfCredentialsEntered(){
	var allFieldsAreEntered = true;
	$('#jira-settings-edit input').each(function(){
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