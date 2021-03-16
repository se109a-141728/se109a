var SpreadSheet = SpreadsheetApp.getActiveSpreadsheet(); //取得試算表
var defaultSheet = SpreadSheet.getSheetByName("default"); //取得預設工作表
var userSheet = SpreadSheet.getSheetByName("user"); //取得使用者工作表
var minimum = defaultSheet.getRange("A2").getValues(); //設定最小換匯金額
var smallest_unit = defaultSheet.getRange("B2").getValues(); //設定最小換匯單位

function myFunction() {

}

function doPost(e) { //處理 LineBot Post Request
    var param = e.postData.contents;
    var json = JSON.parse(param).events;
    if (json != null) {
        for (i in json) {
            var replyToken = json[i].replyToken;
            if (json[i].type == "message") {
                var message = json[i].message;
                if (message.type == "text") {
                    var text = message.text;
                    var userId = json[i].source.userId;
                    var userMinSu = getMinSu(userId);
                    if (!isNaN(Number(text))) {
                        text = Number(text);
                        if (text > 0)
                            LineBotReply(String("台幣換外幣-賣匯：" + ask(text, userMinSu)), String("外幣換台幣-買匯：" + bid(text, userMinSu)), String(replyToken));
                        else
                            LineBotReply("請輸入大於0的數字", String(replyToken));
                    }
                    else {
                        if (text.indexOf("設定最小換匯金額(台幣)：") == 0) {
                            userMinSu[0] = text.split("：")[1];
                            if (isInt(userMinSu[0]) && text.split("：").length == 2) {
                                setupMinSu(userId, userMinSu);
                                LineBotReply("最小換匯金額設定成功", String(replyToken));
                            }
                            else
                                LineBotReply("請輸入正整數", String(replyToken));
                        }
                        else if (text.indexOf("設定最小換匯單位（小數點後幾位）：") == 0) {
                            userMinSu[1] = text.split("：")[1];
                            if (isInt(userMinSu[1]) && text.split("：").length == 2) {
                                setupMinSu(userId, userMinSu);
                                LineBotReply("最小換匯單位設定成功", String(replyToken));
                            }
                            else
                                LineBotReply("請輸入正整數", String(replyToken));
                        }
                        else if (text == "重置") {
                            resetMinSu(userId);
                            LineBotReply("重置成功", String(replyToken));
                        }
                        else
                            LineBotReply("請輸入大於0的數字", String(replyToken));
                    }
                }
            }
        }
    }
    return;
}

function getMinSu(userID) { //取得使用者設定
    var userIDs = userSheet.getRange("A2:A").getValues();
    var index = userIDs.findIndex(element => element == userID);
    var min = minimum;
    var su = smallest_unit;
    if (index != -1) {
        min = userSheet.getRange(index + 2, 2).getValues();
        su = userSheet.getRange(index + 2, 3).getValues();
    }
    return ([min, su])
}

function setupMinSu(userID, userMinSu) { //使用者設定
    var userIDs = userSheet.getRange("A2:A").getValues();
    var index = userIDs.findIndex(element => element == userID);
    if (index == -1) {
        index = userSheet.getLastRow() - 1;
        userSheet.getRange(index + 2, 1).setValue(userID);
    }
    userSheet.getRange(index + 2, 2).setValue(userMinSu[0]);
    userSheet.getRange(index + 2, 3).setValue(userMinSu[1]);
}

function resetMinSu(userID) {
    var userIDs = userSheet.getRange("A2:A").getValues();
    var index = userIDs.findIndex(element => element == userID);
    if (index != -1)
        userSheet.deleteRow(index + 2);
}

function isInt(n) {
    return (!isNaN(Number(n)) && n % 1 === 0)
}

function ask(a, userMinSu) { //台幣換外幣-賣匯
    var min = 999, str = "";
    var UserMin = userMinSu[0];
    var UserSu = userMinSu[1];
    for (var num = Math.floor(Math.floor(UserMin / a * 20) / 20); num <= Math.floor(Math.floor(UserMin / a * 20) / 20.0) + 50; num += Math.pow(10, -UserSu)) {
        var temp = a * num;
        if (temp < UserMin - 0.5) continue;
        var temp2 = Math.floor(temp);

        if ((Math.floor(temp * 10) % 10 <= 4) && (temp2 / num <= min)) {
            min = temp2 / num;
            str = num.toFixed(UserSu) + newLine(num.toFixed(UserSu), temp.toFixed(5), min.toFixed(5));
        }
    }
    return str;
}

function bid(b, userMinSu) { //外幣換台幣-買匯
    var max = -1, str = "";
    var UserMin = userMinSu[0];
    var UserSu = userMinSu[1];
    for (var num = Math.floor(Math.floor(UserMin / b * 20) / 20); num <= Math.floor(Math.floor(UserMin / b * 20) / 20.0) + 50; num += Math.pow(10, -UserSu)) {
        var temp = b * num;
        if (temp < UserMin - 0.5) continue;
        var temp2 = Math.floor(temp) + 1;

        if ((Math.floor(temp * 10) % 10 >= 5) && (temp2 / num >= max)) {
            max = temp2 / num;
            str = num.toFixed(UserSu) + newLine(num.toFixed(UserSu), temp.toFixed(5), max.toFixed(5));
        }
    }
    return str;
}

function newLine(...text) { //將傳入的變數以空格隔開並換行
    var str = "\n"
    text.forEach(function (t) {
        str += t + " "
    })
    str = str.slice(0, str.length - 1);
    return str;
}

function LineBotReply(...values) { //回覆 Line Bot 訊息
    var Auth = defaultSheet.getRange("C2").getValues(); //從試算表取得 LineBot Auth
    var replyToken = values.pop();
    var url = "https://api.line.me/v2/bot/message/reply";
    var json = {
        "replyToken": replyToken,
        "messages": [
        ]
    }
    var i = 0;
    values.forEach(value => {
        json.messages.push({ "type": "text", "text": value });
    });
    var options = {
        "async": true,
        "crossDomain": true,
        "method": "POST",
        "headers": {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + Auth
        },
        "payload": JSON.stringify(json)
    };
    var response = UrlFetchApp.fetch(url, options);
}