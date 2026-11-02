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

function bestExchange(rateInput, userMinSu, direction) {
    const min = Number(userMinSu[0]);
    const digits = Number(userMinSu[1]);

    if (!Number.isSafeInteger(min) || min <= 0 ||
        !Number.isInteger(digits) || digits < 1 || digits > 4) {
        return "";
    }

    const rateText = String(rateInput).trim();
    if (!/^\d+(?:\.\d+)?$/.test(rateText)) return "";

    const [integer, decimal = ""] = rateText.split(".");
    const P = BigInt(integer + decimal);
    const Q = BigInt(10) ** BigInt(decimal.length);
    if (P <= BigInt(0)) return "";

    const scale = BigInt(10) ** BigInt(digits);
    const D = Q * scale;
    const ceilDiv = (a, b) => (a + b - BigInt(1)) / b;

    function gcd(a, b) {
        while (b !== BigInt(0)) [a, b] = [b, a % b];
        return a;
    }

    function fixed(numerator, denominator, places) {
        const factor = BigInt(10) ** BigInt(places);
        const rounded = (BigInt(2) * numerator * factor + denominator) /
            (BigInt(2) * denominator);

        return (rounded / factor).toString() + "." +
            (rounded % factor).toString().padStart(places, "0");
    }

    // 利用匯率的有理數特性，計算四捨五入可能產生的最大利益
    const g = gcd(P, D);
    const maxDown = ((D - BigInt(1)) / (BigInt(2) * g)) * g;
    const firstUp = ceilDiv(D, BigInt(2) * g) * g;
    const maxUp = firstUp < D ? D - firstUp : BigInt(0);

    // 從四捨五入後符合最低台幣金額的位置開始
    const lower = ceilDiv(
        (BigInt(2) * BigInt(min) - BigInt(1)) * D,
        BigInt(2) * P
    );

    let bestIndex = BigInt(0);
    let bestTWD = BigInt(0);

    const MAX_CANDIDATES = 60000;

    for (
        let index = lower > BigInt(0) ? lower : BigInt(1), tested = 0;
        tested < MAX_CANDIDATES;
        index++, tested++
    ) {
        const raw = P * index;
        const twd = (BigInt(2) * raw + D) / (BigInt(2) * D);

        if (twd < BigInt(min)) continue;

        const better = bestIndex === BigInt(0) || (
            direction === "ask"
                ? twd * bestIndex < bestTWD * index
                : twd * bestIndex > bestTWD * index
        );

        if (better) {
            bestIndex = index;
            bestTWD = twd;
        }

        // 判斷往後所有候選值是否都不可能更好
        const next = index + BigInt(1);
        const left = bestTWD * D * next;
        const right = bestIndex * (
            P * next + (direction === "ask" ? -maxDown : maxUp)
        );

        const proven = direction === "ask"
            ? left <= right
            : left >= right;

        if (!proven) continue;

        const amount = (bestIndex / scale).toString() + "." +
            (bestIndex % scale).toString().padStart(digits, "0");

        const rawTWD = fixed(P * bestIndex, D, 5);
        const effectiveRate = fixed(
            bestTWD * scale,
            bestIndex,
            5
        );

        return amount + newLine(
            amount,
            rawTWD,
            effectiveRate
        );
    }

    return `搜尋超過 ${MAX_CANDIDATES} 筆候選值，尚無法證明最佳解。`;
}

function ask(a, userMinSu) {
    // 台幣換外幣：有效匯率越低越好
    return bestExchange(a, userMinSu, "ask");
}

function bid(b, userMinSu) {
    // 外幣換台幣：有效匯率越高越好
    return bestExchange(b, userMinSu, "bid");
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