function getNotificationsDataFromLocalStoragePromise(){
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

function saveNotificationsDataToLocalStoragePromise(data) {
    return new Promise(function(resolve,reject){
        var notifications_data = JSON.stringify(data);
        chrome.storage.sync.set({
            jiraNotifications: notifications_data
        }, function() {
            resolve();
        });
    });
}

function getNotificationsData() {
    var notifications = [];
    $('.jira-notifications-container .notification-body .input-group').each(function(){
        var issue = $(this).find('input[name="key"]').val();
        var status = $(this).find('input[name="status"]').val();
        if (issue.length > 0 && status.length >0) {
            notifications.push({
                "issue": issue,
                "status": status
            })
        }
    });
    return notifications;
}

function makeNotificationsDisplayView(){
    $(".jira-notifications-container")
        .find('.notification-body input').prop('disabled', true).end()
        .find('.notification-body .remove-notification').hide().end()
        .find('.notification-body .add-notification').hide().end()
        .find('.save-notifications').hide().end()
        .find('.edit-notification-icon').show().end()
        .find('.cancel-edit-notification').hide().end();
}

function makeNotificationsEditView(){
    $(".jira-notifications-container")
        .find('.notification-body .input-group input').prop('disabled', false).end()
        .find('.notification-body .remove-notification').show().end()
        .find('.notification-body .add-notification').show().end()
        .find('.save-notifications').show().end()
        .find('.edit-notification-icon').hide().end()
        .find('.cancel-edit-notification').show().end();
}

function buildNotificationsBlock(){
    getNotificationsDataFromLocalStoragePromise().then(
        function(data){
            $('.jira-notifications-table .jira-notifications-content').remove();
            var template = $('.jira-notifications-table-template .jira-notifications-content').clone();
            template
                .find('.remove-notification').attr('disabled','disabled').end()
                .find('.edit-notification-icon').hide().end()
                .find('.cancel-edit-notification').show().end();
            var length = data.length;
            if (length > 1) {
                template.find('.remove-notification').removeAttr('disabled');
            }
            while (length > 0) {
                template.find('.notification-body  .input-group:last')
                     .find('input[name="key"]').val(data[data.length-length]["issue"]).end()
                     .find('input[name="status"]').val(data[data.length-length]["status"]).end();
                length--;
                if (length > 0) {
                    var input = template.find('.notification-body  .input-group:last');
                    var newParam =
                        input.clone()
                            .find('input[name="key"]').val("").end()
                            .find('input[name="status"]').val("").end();
                    input.after(newParam);
                }

            }
            template.appendTo('.jira-notifications-table');
            makeNotificationsDisplayView();
        },
        function(){ console.log('Unable to build notifications block!')}
    )
}

function saveNotificationsDataToLocalStorage() {
    var data = getNotificationsData();
    saveNotificationsDataToLocalStoragePromise(data).then(
        function(){
            console.log("Notifications data successfully saved!");
            buildNotificationsBlock();
        },
        function(){
            console.log("unable to save notifications data!");
        }
    )
}

function displayNotificationsList(){
    getNotificationsDataFromLocalStoragePromise().then(function(data){
       if (data.length > 0){
           buildNotificationsBlock();
       }
       else {
           $('.jira-notifications-no-rules-are-added').show();
       }
    });
}

function showAddNotificationsTable(){
    $('.jira-notifications-no-rules-are-added').hide();
    var template = $('.jira-notifications-table-template .jira-notifications-content').clone();
    template
        .find('.remove-notification').attr('disabled','disabled').end()
        .find('.edit-notification-icon').hide().end()
        .find('.cancel-edit-notification').show().end();
    template.appendTo('.jira-notifications-table');
}

function removeNotification(){
    var count = $(".jira-notifications-container .notification-body .input-group").length;
    $(this).closest('div').remove();
    count--;
    if (count < 2) $('.jira-notifications-container .notification-body .remove-notification').attr('disabled','disabled');
}

function addNotification(){
    var count = $(".jira-notifications-container .notification-body .input-group").length;
    var $input = $('.jira-notifications-container .notification-body  .input-group:last');
    var $newParam =
        $input.clone()
            .find('input[name="key"]').val("").end()
            .find('input[name="status"]').val("").end();
    $input.after($newParam);
    count++;
    if (count > 1) $('.jira-notifications-container .notification-body .remove-notification').removeAttr('disabled');
}

(function($) {
    $(document).ready(function(){
        displayNotificationsList();
        $(document)
            .on('click', '.addNotificationBlock', showAddNotificationsTable)
            .on('click', '.remove-notification', removeNotification)
            .on('click', '.add-notification', addNotification)
            .on('click', '.save-notifications', saveNotificationsDataToLocalStorage)
            .on('click', '.edit-notification-icon',makeNotificationsEditView)
            .on('click', '.cancel-edit-notification',displayNotificationsList)
    })
})(jQuery);