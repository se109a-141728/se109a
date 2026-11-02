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
    var num = Number(n);
    return (!isNaN(num) && Number.isInteger(num) && num > 0);
}

function isValidSu(n) { //外幣小數位數須介於 1~4 之間
    var num = Number(n);
    return (!isNaN(num) && Number.isInteger(num) && num >= 1 && num <= 4);
}

function ask(a, userMinSu) { //台幣換外幣-賣匯
    var min = Infinity, str = "";
    var UserMin = Number(userMinSu[0]);
    var UserSu = Number(userMinSu[1]);
    if (!isValidSu(UserSu) || !isInt(UserMin)) return "";

    var scale = Math.pow(10, UserSu);
    var startI = Math.ceil((UserMin - 0.5) * scale / a);
    var endI = startI + Math.ceil(scale / a) + 1;

    for (var i = startI; i <= endI; i++) {
        var num = i / scale;
        var twdRounded = a * i / scale;
        if (Math.round(twdRounded) < UserMin) continue;

        var tenthDigit = Math.floor(twdRounded * 10) % 10;
        if (tenthDigit > 4) continue;

        var effectiveRate = Math.floor(twdRounded) / num;
        if (effectiveRate <= min) {
            min = effectiveRate;
            str = num.toFixed(UserSu) + newLine(num.toFixed(UserSu), twdRounded.toFixed(5), min.toFixed(5));
        }
    }
    return str;
}

function bid(b, userMinSu) { //外幣換台幣-買匯
    var max = -1, str = "";
    var UserMin = Number(userMinSu[0]);
    var UserSu = Number(userMinSu[1]);
    if (!isValidSu(UserSu) || !isInt(UserMin)) return "";

    var scale = Math.pow(10, UserSu);
    var startI = Math.ceil((UserMin - 0.5) * scale / b);
    var endI = startI + Math.ceil(scale / b) + 1;

    for (var i = startI; i <= endI; i++) {
        var num = i / scale;
        var twdRounded = b * i / scale;
        if (Math.round(twdRounded) < UserMin) continue;

        var tenthDigit = Math.floor(twdRounded * 10) % 10;
        if (tenthDigit < 5) continue;

        var effectiveRate = (Math.floor(twdRounded) + 1) / num;
        if (effectiveRate >= max) {
            max = effectiveRate;
            str = num.toFixed(UserSu) + newLine(num.toFixed(UserSu), twdRounded.toFixed(5), max.toFixed(5));
        }
    }
    return str;
}

function newLine(...text) { //將傳入的變數以空格隔開並換行
    var str = "\n";
    text.forEach(function (t) {
        str += t + " ";
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