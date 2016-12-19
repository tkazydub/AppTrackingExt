function signInToJenkins(){
    sendSignInToJenkinsRequest({"host":"","username": "","password":""}).then(
        function(response){signedInJenkinsAction(response)},
        function(error){ console.log("Error:" + error)}
    );
}

function signedInJenkinsAction(resp){
    if (resp == 200) {
        console.log("sucessfully signed in!!!!")
    }
}

function sendSignInToJenkinsRequest(data){
    return new Promise(function(resolve,reject){
        var xhr = new XMLHttpRequest();
        var credentials = window.btoa(data["username"] + ":" + data["password"])
        xhr.open("GET", data["host"],true);
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

function getJenkinsJobsDataPromise(jenkinsHost){
            return new Promise(function(resolve,reject){
                var xhr = new XMLHttpRequest();
                xhr.open("GET", jenkinsHost, true);
                xhr.onload = function() {
                    if (xhr.status == 200) {
                        var jobs = JSON.parse(xhr.response)["jobs"];
                        $("#results").text("Success!!!");
                        resolve(jobs)
                    }
                    else {
                        $("#results").text("error during fetching data!");
                        reject({"status": xhr.status, "response": this.statusText})
                    }
                };
                xhr.send();
            });
}


function getJenkinsJobStatus(){
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
                    return jobsStatus;
                }

            ).then(
                function(data) {
                    buildJenkinsStatusTable(data);
                }
            );
        }
    );
}

function buildJenkinsStatusTable(data) {
    var jenkinsJobsTable = $('.jenkins-jobs-table-template .jenkins-jobs-table').clone();
    if (data.length > 0) {
        jenkinsJobsTable.find("table tbody")
            .find("td[name='jobName']").html('<a href="' + data[0]["url"] + '">' + data[0]["name"] + '</a>').end()
            .find("td[name='jobStatus']").text(data[0]["color"]).end();
    }
    for (var i=1; i<data.length; i++) {
        var newJob = jenkinsJobsTable.find("table tbody tr:last").clone()
            .find("td[name='jobName']").html('<a href="' + data[i]["url"] + '">' + data[i]["name"] + '</a>').end()
            .find("td[name='jobStatus']").text(data[i]["color"]).end();
        jenkinsJobsTable.find("table tbody tr:last").after(newJob);
    }
    jenkinsJobsTable.appendTo('.jenkins-jobs-container-body');
}

function getJenkinsDataFromLocalStoragePromise(){
    return new Promise(function(resolve,reject){
        chrome.storage.sync.get({
            jenkinsData: []
        },function(data){
            if (data.jenkinsData.length > 0){
                resolve(JSON.parse(data.jenkinsData));
            }
            else {
                resolve({"host": "", "jobs":[]});
            }
        });
    });
}

function getJenkinsDataFromLocalStorage(){
    getJenkinsDataFromLocalStoragePromise().then(
      function(data) {
          console.log('Received data: \n');
          console.log(data);
      }
    );
}

function getDataFromJenkinsContainer(){
    var host = $('.jenkins-settings-body #jenkins-host').val();
    var jobs = [];
    $(".jenkins-settings-body .job-name").each(function(){
        jobs.push($(this).val());
    });
    return {"host": host, "jobs": jobs}
}

function saveJenkinsDataToLocalStoragePromise(data) {
    return new Promise(function(resolve,reject){
        var string_data = JSON.stringify(data);
        chrome.storage.sync.set({
            jenkinsData: string_data
        }, function() {
            resolve();
        });
    });
}

function saveJenkinsDataToLocalStorage() {
    var jenkinsData = getDataFromJenkinsContainer();
    saveJenkinsDataToLocalStoragePromise(jenkinsData).then(
        function(response) {
            console.log("Jenkins data successfully saved!");
            createJenkinsSettingsFromData();
        }
    );
}

function createJenkinsSettingsFromData(){
    getJenkinsDataFromLocalStoragePromise().then(
        function(data){buildJenkinsSettingsContainer(data)}
    );
}

function buildJenkinsSettingsContainer(data){
    $(".jenkins-settings-body .jenkins-settings").remove();
    var template = $(".jenkins-settings-template .jenkins-settings").clone();
    var jenkinsData =  data;
    if (jenkinsData.host) {
        template.find('#jenkins-host').val(jenkinsData.host);
    }
    if (jenkinsData.jobs.length == 1) {
        template.find('#jenkins-job-0').val(jenkinsData.jobs[0]);
    }
    else {
        if (jenkinsData.jobs.length > 1) {
            template.find('#jenkins-job-0').val(jenkinsData.jobs[0]);
            for (var i=1; i<jenkinsData.jobs.length; i++){
                var newJob = template.find('#jenkins-jobs .input-group:last').clone()
                    .find("input").val(jenkinsData.jobs[i]).end()
                    .find("input").attr("id", "jenkins-job-" + i).end();
                template.find('#jenkins-jobs .input-group:last').after(newJob);
            }
        }
    }
    template.appendTo($(".jenkins-settings-body"));
    makeJenkinsSettingsContainerDisplayView();
}

function makeJenkinsSettingsContainerDisplayView(){
    $('.jenkins-settings-container-body')
        .find('input').css('font-style','italic').prop('disabled', true).end()
        .find('button').hide().end()
        .find('#jenkins-credentials-cancel').hide().end()
        .find('#jenkins-credentials-edit').show().end();
}

function makeJenkinsSettingsContainerEditView() {
    $('.jenkins-settings-container-body')
        .find('input').css('font-style','normal').prop('disabled', false).end()
        .find('button').show().end()
        .find('#jenkins-credentials-cancel').show().end()
        .find('#jenkins-credentials-edit').hide().end();
}

(function($) {
    $(document).ready(function(){
        createJenkinsSettingsFromData();
        getJenkinsJobStatus();
        //checkSignInStatus();
        $(document)
            .on('click', '#submit-jenkins-settings', saveJenkinsDataToLocalStorage)
            .on('click', '#jenkins-credentials-edit', makeJenkinsSettingsContainerEditView)
            .on('click', '#jenkins-credentials-cancel',createJenkinsSettingsFromData)
    })
})(jQuery);