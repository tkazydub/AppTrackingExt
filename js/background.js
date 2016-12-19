var myAlert = function(){
    alert("working");
};

function setBadgeText(text) {
    chrome.browserAction.setBadgeText({text: String(text)});
}

function getNumberOfFailingJobs(){

}



var opt = {
    type: "basic",
    title: "Primary Title",
    message: "Primary message to display",
    iconUrl: "img/icon-48.png"
};

function callback(id){
    console.log("Callback function for notification");
}

function createNotification(id, opt){
    console.log("creating notification!");
    chrome.notifications.create(id, opt, callback(id));
    console.log("notification created!");
}


$(document).ready(function(){
    //setInterval(myAlert,4000);
    setBadgeText(5);
    createNotification("123", opt);
});