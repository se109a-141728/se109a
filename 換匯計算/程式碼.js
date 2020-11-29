function myFunction() {
  
}

var minimum = 100;
var smallest_unit = 2;

function ask(a) { //台幣換外幣-賣匯
    var min = 999, str = "";
    for (var num = Math.floor(Math.floor(minimum / a * 20) / 20); num <= Math.floor(Math.floor(minimum / a * 20) / 20.0) + 100; num += Math.pow(10, -smallest_unit))
    {
        var temp = a * num;
        if (temp < minimum - 0.5) continue;
        var temp2 = Math.floor(temp);

        if ((Math.floor(temp * 10) % 10 <= 4) && (temp2 / num <= min)) {
            min = temp2 / num;
            str += newLine(temp.toFixed(5), num.toFixed(smallest_unit), min.toFixed(5));
        }
    }
    str = str.slice(0,str.length-1)
    Logger.log(str);
    return str;
}

function bid(b) { //台幣換外幣-賣匯
    var max = -1, str = "";
    for (var num = Math.floor(Math.floor(minimum / b * 20) / 20); num <= Math.floor(Math.floor(minimum / b * 20) / 20.0) + 100; num += Math.pow(10, -smallest_unit))
    {
        var temp = b * num;
        if (temp < minimum - 0.5) continue;
        var temp2 = Math.floor(temp) + 1;

        if ((Math.floor(temp * 10) % 10 >= 5) && (temp2 / num >= max)) {
            max = temp2 / num;
            str += newLine(temp.toFixed(5), num.toFixed(smallest_unit), max.toFixed(5));
        }
    }
    str = str.slice(0,str.length-1)
    Logger.log(str);
    return str;
}

function newLine(...text){
    var str = ""
    text.forEach(function(t)
        {
            str += t + " "
        }
    )
    str = str.slice(0,str.length-1) + "\n";
    return str;
}