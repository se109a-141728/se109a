var SpreadSheet = SpreadsheetApp.getActiveSpreadsheet(); //取得試算表
var defaultSheet = SpreadSheet.getSheetByName("default"); //取得工作表

function myFunction() {
    
}

var minimum = 100; //設定最小換匯金額
var smallest_unit = 2; //設定最小換匯單位

function ask(a) { //台幣換外幣-賣匯
    var min = 999, str = "";
    for (var num = Math.floor(Math.floor(minimum / a * 20) / 20); num <= Math.floor(Math.floor(minimum / a * 20) / 20.0) + 50; num += Math.pow(10, -smallest_unit)) {
        var temp = a * num;
        if (temp < minimum - 0.5) continue;
        var temp2 = Math.floor(temp);

        if ((Math.floor(temp * 10) % 10 <= 4) && (temp2 / num <= min)) {
            min = temp2 / num;
            str += newLine(temp.toFixed(5), num.toFixed(smallest_unit), min.toFixed(5));
        }
    }
    str = str.slice(0, str.length - 1);
    Logger.log(str);
    return str;
}

function bid(b) { //外幣換台幣-買匯
    var max = -1, str = "";
    for (var num = Math.floor(Math.floor(minimum / b * 20) / 20); num <= Math.floor(Math.floor(minimum / b * 20) / 20.0) + 50; num += Math.pow(10, -smallest_unit)) {
        var temp = b * num;
        if (temp < minimum - 0.5) continue;
        var temp2 = Math.floor(temp) + 1;

        if ((Math.floor(temp * 10) % 10 >= 5) && (temp2 / num >= max)) {
            max = temp2 / num;
            str += newLine(temp.toFixed(5), num.toFixed(smallest_unit), max.toFixed(5));
        }
    }
    str = str.slice(0, str.length - 1);
    Logger.log(str);
    return str;
}

function newLine(...text) { //將傳入的變數以空格隔開並換行
    var str = ""
    text.forEach(function (t) {
        str += t + " "
    })
    str = str.slice(0, str.length - 1) + "\n";
    return str;
}

function doPost(e) { //處理 LineBot Post Request
    var param = e.postData.contents;
    Logger.log(param);
    var json = JSON.parse(param).events;
    if (json != null) {
        for (i in json) {
            var replyToken = json[i].replyToken;
            var userId = json[i].source.userId;
            if (json[i].type == "message") {
                var message = json[i].message;
                if (message.type == "text") {
                    var text = message.text;
                    if (text == "取得 userID")
                        LineBotReplyID(String(userId), String(replyToken));
                    else if (!isNaN(Number(text))) {
                        text = Number(text);
                        if (text > 0)
                            LineBotReply(String(ask(text)), String(replyToken));
                        else if (text < 0)
                            LineBotReply(String(bid(-text)), String(replyToken));
                        else
                            LineBotReply("輸入不可為0", String(replyToken));
                    }
                    else
                        LineBotReply(String(text), String(replyToken));
                }
            }
        }
    }
    return;
}

Auth = defaultSheet.getRange("C2").getValues(); //從試算表取得 LineBot Auth

function LineBotReply(str, replyToken) { //回覆 Line Bot 訊息
    url = "https://api.line.me/v2/bot/message/reply";
    var options = {
        "async": true,
        "crossDomain": true,
        "method": "POST",
        "headers": {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + Auth
        },
        "payload": JSON.stringify({
            "replyToken": replyToken,
            "messages": [
                {
                    "type": "text",
                    "text": str
                }
            ]
        })
    };
    var response = UrlFetchApp.fetch(url, options);
}