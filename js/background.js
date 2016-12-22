function getHostPromise(){
    return new Promise(function(resolve,reject){
        chrome.storage.sync.get({
            jiraHost: ''
        }, function(items) {
            $host = items.jiraHost;
            resolve();
        });
    });
}

function getActualNotificationsDataPromise(){
    return new Promise(function(resolve,reject){
        chrome.storage.sync.get({
            jiraCurrentNotificationsData: []
        }, function(items) {
            resolve(JSON.parse(items.jiraCurrentNotificationsData));
        });
    });
}

function saveActualNotificationsDataPromise(data) {
    return new Promise(function(resolve,reject){
        var notifications_data = JSON.stringify(data);
        chrome.storage.sync.set({
            jiraCurrentNotificationsData: notifications_data
        }, function() {
            resolve();
        });
    });
}


function getIssueInfoPromise(data) {
    return new Promise(function(resolve,reject){
        var xhr = new XMLHttpRequest();
        xhr.open("GET", $host + "/rest/api/latest/issue/" + data['issue'], true);
        xhr.onload = function() {
            if (xhr.status==200) {
                data["currentStatus"] = JSON.parse(xhr.response)["fields"]["status"]["name"];
                data["summary"] = JSON.parse(xhr.response)["fields"]["summary"];
                resolve(data);
            }
            else {
                reject(xhr.status);
            }
        };
        xhr.send();
    });
}

function removeUntreckableNotifications(listedData, actualData) {
    if (listedData instanceof Array && listedData.length > 0) {
        for (var i=0; i< actualData.length; i++){
            var isPresent = false;
            for (var j=0; j<listedData.length; j++) {
                if (actualData[i]['issue'] == listedData[j]['issue']) {
                    isPresent = true;
                    break;
                }
            }
            if (!isPresent) {
                actualData.splice(i,1);
            }
        }
        return actualData;
    }
    else {
        return []
    }
}

function addActualNotificationIfNotExists(actualData, dataToAdd) {
    if (actualData instanceof Array) {
        var isPresent = false;
        for (var i=0; i<actualData.length; i++){
            if (actualData[i]['issue'] == dataToAdd['issue']) {
                actualData[i] = dataToAdd;
                isPresent = true;
                break;
            }
        }
        if (!isPresent) {actualData.push(dataToAdd)}
        return actualData;
    }
    else {
        return [dataToAdd]
    }
}

function getIssueCurrentStatus(){
    getNotificationsFromLSPromise().then(
    function(data) {
        data['notifications'].forEach(function (el) {
            getIssueInfoPromise(el).then(
                function (issueData) {
                    getActualNotificationsDataPromise().then(function(actualNotificationsData){
                        var currentData = removeUntreckableNotifications(data,actualNotificationsData);
                        var updatedData = addActualNotificationIfNotExists(currentData, issueData);
                        console.log('updated data:\n');
                        console.log(updatedData);
                        saveActualNotificationsDataPromise(updatedData).then(
                            function(){
                                console.log("Actual Data successfully saved!");
                                getCompletedIssues();
                            }
                        )
                    });

                }
            )
        });

    });
}


function getCompletedIssues(){
    getActualNotificationsDataPromise().then(function(data){
       var completedIssues = [];
       data.forEach(function (el) {
               if (el['status'] == el['currentStatus']) {
                   completedIssues.push(el);
               }
           });
       setBadgeText(completedIssues.length);
       makeNotificationForCompletedIssues(completedIssues);
    });
}

function setBadgeText(text) {
    chrome.browserAction.setBadgeText({text: String(text)});
}

function getNotificationsFromLSPromise(){
    return new Promise(function(resolve, reject){
        chrome.storage.sync.get({
            jiraNotifications: []
        }, function(data){
            if (data.jiraNotifications.length > 0){
                resolve(JSON.parse(data.jiraNotifications));
            }
            else {
                resolve([]);
            }
        });
    });
}

function makeNotificationForCompletedIssues(issues){

    function makeItemsForOptions(data){
        var items = [];
        data.forEach(function(el){
            items.push({title: el["issue"], message: "Status: " + el["currentStatus"]});
        });
        return items;
    }
    var options = {
        type: "list",
        title: "Jira Tracking Ext",
        message: "Checkout Jira issues!",
        iconUrl: "img/icon-48.png",
        items: makeItemsForOptions(issues)
    };

    chrome.notifications.getAll(function(notifications){
        if (notifications['issuesStatus']) {
            chrome.notifications.update("issuesStatus",options);
            console.log('Notification Updated!');
        }
        else {
            chrome.notifications.create("issuesStatus",options);
            console.log('Notification Created!');
        }
    });


}

function makeSearchRequest(issues){
    var query = "/browse/";
    for (var i=0; i<issues.length; i++) {
        if (i==0) {
            query += issues[i]['issue'] + "?jql=key="+issues[i]['issue'];
        }
        else {
            query += " or key=" + issues[i]['issue']
        }
    }
    return query;
}

function openJiraSearch() {
    getActualNotificationsDataPromise().then(function(data){
        var completedIssues = [];
        data.forEach(function (el) {
            if (el['status'] == el['currentStatus']) {
                completedIssues.push(el);
            }
        });
        var searchUrl = $host + makeSearchRequest(completedIssues);
        chrome.tabs.create({ url: searchUrl });
    });
}

$(document).ready(function(){
    chrome.notifications.onClicked.addListener(function(notificationId){
        openJiraSearch();
    });
    getHostPromise().then(function(){
        getNotificationsFromLSPromise().then(function(data){
            console.log("updateTime:\n");
            var time = parseInt(data['updateTime']) * 60 *1000;
            console.log(time);
        });
        //setInterval(getIssueCurrentStatus,time);
    });

});

//issue,status,summary,currentStatus