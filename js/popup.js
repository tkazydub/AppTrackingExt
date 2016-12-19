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
function checkSignInStatus(){
	getStorageDataPromise().then(function(){
		amISignedInCallBack();
	});
}


function signOutPromise(){
	return new Promise(function(resolve,reject){
		var xhr = new XMLHttpRequest();
		xhr.open("DELETE", $host + "/rest/auth/1/session");
		xhr.onload = function() {
			if (xhr.status == 204){
				resolve(xhr.status);
			}
			else {
				reject({"status": xhr.status, "response": xhr.statusText});
			}
		}
		xhr.send();
	});
}

function signOut(){
	signOutPromise().then(
			function() {
				$('.list').remove();
				onSignInActions(false);},
			function() {console.log(error)}
		);
}


function amISignedInJira(){
	return new Promise(function(resolve,reject){
		var xhr = new XMLHttpRequest();
		xhr.open("GET", $host + "/rest/api/2/dashboard", true);
		xhr.onload = function() {
			if (xhr.status==404){
				var error = new Error(this.statusText);
        		error.code = this.status;
        		reject(error);
			}
			else if (xhr.status==401){
				console.log("Received 401 Not Authorized!");
				resolve(false);
			}
			else if (xhr.getResponseHeader('X-AUSERNAME').toLowerCase()=="anonymous"){
					console.log("I'm not signed in");
					resolve(false);
			}
			else if (xhr.getResponseHeader('X-AUSERNAME').toLowerCase() != $username.toLowerCase()) {
				signOut();
				resolve(false);
			}	
			else {
				resolve(true);
			}
		}
		xhr.send();
	});
}

function amISignedInCallBack(){
	amISignedInJira().then(
    function(response) {
    	onSignInActions(response);
    	getSearchData();

    },
    function(error) {
    	console.log('Rejected: ' + error);
    }
    );
}

function onSignInActions(response){
	if (response) {
		changeStatusIndicator("#5EF33A");
		displayMainBlock(true);
	}
	else {
		changeStatusIndicator("#E5E4E2");
		displayMainBlock(false);	
	}
}


function signInToJira(){
	sendSignInToJiraRequest({"host":$host,"username":$username,"password":$password}).then(
			function(response){signedInAction(response)},
			function(error){ console.log("Error:" + error)}
		);
}

function signedInAction(resp){
	if (resp == 200) {
		amISignedInCallBack();
	}
}

function sendSignInToJiraRequest(data){
	return new Promise(function(resolve,reject){
		var xhr = new XMLHttpRequest();
		var credentials = window.btoa(data["username"] + ":" + data["password"])
		xhr.open("GET", $host + "/rest/api/2/issue/736619",true);
		xhr.setRequestHeader("Authorization", "Basic "+credentials);

		xhr.onload = function () {
			headers = xhr.getAllResponseHeaders();
			if (xhr.status == 200) {
				$("#resp").text("Sign in completed");
				resolve(xhr.status)
			}
			else{
				$("#resp").text("Error during sign in");
				reject({"status": xhr.status, "response": this.statusText})
			}
		};
		xhr.send();
	});
}

function openSettings(e) {
	var optionsUrl = chrome.extension.getURL('test.html');
	chrome.tabs.query({url: optionsUrl}, function(tabs) {
	    if (tabs.length) {
	        chrome.tabs.update(tabs[0].id, {active: true});
	    } else {
	        chrome.tabs.create({url: optionsUrl});
	    }
	});
}

function changeStatusIndicator(color){
    $(".jira-status-indicator").css('backgroundColor',color);
  }

function displayMainBlock(status) {
	if (status){
		document.getElementById("sign-in-block").style.display = "none";
		document.getElementById("main-container").style.display = "block";
	}
	else {
		document.getElementById("sign-in-block").style.display = "block";
		document.getElementById("main-container").style.display = "none";
		document.getElementById('username').value = $username;
		document.getElementById('password').value = $password;
		document.getElementById("submit-jira-credentials").addEventListener('click',signInToJira);
	}	
}

function searchRequestJiraPromise(data) {
	return new Promise(function(resolve,reject){
		var xhr = new XMLHttpRequest();
		xhr.open("GET", $host + "/rest/api/2/search?jql=" + data['search_url'], true);
		xhr.onload = function() {
			if (xhr.status==200) {
				data["response"] = JSON.parse(xhr.response);
				resolve(data);
			}
			else {
				reject(xhr.status);
			}
		};
		xhr.send();
	});	
}

function getSearchData(){
	getStorageDataPromise().then(function(){
		data = JSON.parse($jira_filter);
		
		for (var i=0; i<data.length; i++){
			searchRequestJiraPromise(data[i]).then(function(response){
				displayFilter(response);
			});
		}
	});
}

function displayFilter(data){
	var issues = data['response']['issues'];
	var newList = $('.list-template').clone().attr('class','list');
	newList.find('div.list-header').attr('href','#collapse'+data['id']);
	newList.find('div.collapse').attr('id','collapse'+data['id']);
	newList.find('span.display-filter-name').text(data["name"]);
	newList.find('span.display-issues-found').text(issues.length);
	if (issues.length>0){
		for (var i=0; i<issues.length; i++){
			var newLine = newList.find('tbody tr:last').clone()
				.find('td[name="key"]').html('<a href="' + $host + '/browse/' + issues[i]["key"] + '">'+ issues[i]["key"] + '</a>').end()
				.find('td[name="summary"]').text(issues[i]["fields"]["summary"]).end()
				.find('td[name="status"]').text(issues[i]["fields"]["status"]["name"]).end();
			newList.find('tbody tr:last').after(newLine);
		}
		newList.find('tbody tr:first').remove();
	}
	else {
		newList.find('table').remove();
		newList.find('div.collapse .list-body').append('<div class="no-results-text">No issues found</div>');
	}	
	$(".filter-container").append(newList);
}


function displayJenkinsJobsPopUp(){
		getJenkinsDataFromLocalStoragePromise().then(
			function(data){
				if (data.jobs.length > 0) {
					return data
				}
				else {
					return null;
				}
			}
		).then(function(data){
				getJenkinsJobsDataPromise(data.host).then(
					function(response){
						var jobsStatus = [];
						for (var j=0; j < data.jobs.length; j++){
							var job_status = $.grep(response, function(e){return e.name == data.jobs[j]});
							if (job_status.length > 0) {
								jobsStatus.push(job_status[0]);
							}
						}
						changeJenkinsStatusIndicator("#5EF33A");
						return jobsStatus;
					},
					function (error){changeJenkinsStatusIndicator("#E5E4E2")}

				).then(
					function(data) {
						createJenkinsPopUp(data);
					}
				);
			}
		);
}


function createJenkinsPopUp(data){
	var jobs = data;
	var jenkinsList = $('.jenkins-popup-container-template').clone().attr('class','list');
	jenkinsList.find('div.list-header').attr('href','#jenkins-collapse-0');
	jenkinsList.find('div.collapse').attr('id','jenkins-collapse-0');
	jenkinsList.find('span.tracked-jobs-count').text(jobs.length);
	if (jobs.length>0) {
		for (var i=0; i<jobs.length; i++){
			var newLine = jenkinsList.find('tbody tr:last').clone()
				.find('td[name="job"]').html('<a href="' + jobs[i]["url"]+ '">' + jobs[i]["name"] + '</a>').end()
				.find('td[name="status"]').text(data[i]["color"]).end();
			jenkinsList.find('tbody tr:last').after(newLine);
		}
		jenkinsList.find('tbody tr:first').remove();
	}
	else {
		jenkinsList.find('table').remove();
		jenkinsList.find('div.collapse .list-body').append('<div class="no-results-text">No Jobs are tracked at the moment</div>');
	}
	$('#jenkins-popup-container .jenkins-container').append(jenkinsList);
}

function changeJenkinsStatusIndicator(color){
	$(".jenkins-status-indicator").css('backgroundColor',color);
}


(function($) {
  		$(document).ready(function(){
  			checkSignInStatus();
			displayJenkinsJobsPopUp();
  			$(document)
  				.on('click', '#open-settings-page', openSettings)
  				.on('click', '#sign-in-jira', signInToJira)
  				.on('click', '#sign_out_jira', signOut)
  			})
})(jQuery);