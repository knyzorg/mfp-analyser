var request = require('request');
const cheerio = require('cheerio')
var fs = require('fs')
    , util = require('util')
    , stream = require('stream')
    , es = require('event-stream');


function getData(id, wid, cb) {
    request(`http://www.myfitnesspal.com/food/update_nutrition_facts_table/?id=${id}&quantity=1&weight_id=${wid}`, function (error, response, body) {
        if (error) {
            console.log(error)
            return;
        }
        const $ = cheerio.load(body);
        var food = {}
        var datapts = ["Calories", "Total Fat"]
        $("#nutrition-facts .col-1").each(function (index, elem) {
            datapts.push($(this).text());
        })

        datapts.forEach((pt) => {
            if ($(`.col-1:contains('${pt}')`).length && /\S/.test(pt)) {
                food[pt] = $(`.col-1:contains('${pt}')`).next().text();
            }
        })
        cb(food);

    })
}

function analyse(id, finished, cb) {
    request(`http://www.myfitnesspal.com/food/calories/tostitos-bite-size-corn-chips-${id}`, function (error, response, body) {
        if (error) {
            console.log(error)
            console.log("Failed ID", id)
            finished()
            return;
        }
        var $ = cheerio.load(body);
        var brand = $(".col-1 .secondary-title").text().substr(10);
        var lenn = ($(".select option").length)
        $(".select option").each(function (index, elem) {
            var wid = $(this).text()
            var portion = $(this).val();
            request(`http://www.myfitnesspal.com/food/calories/${id}`, function (error, response, body) {
                getData(id, wid, (food) => {

                    var $ = cheerio.load(body);
                    console.log()
                    food["Name"] = $(".main-title").text().substr(13)
                    food["Weight ID"] = portion;
                    food["Portion"] = wid;
                    food["Brand"] = brand;
                    food["Food ID"] = $($("link[rel=alternate]")[27]).attr("href").substr($($("link[rel=alternate]")[27]).attr("href").indexOf("?") + 4, $($("link[rel=alternate]")[27]).attr("href").indexOf("&") - ($($("link[rel=alternate]")[27]).attr("href").indexOf("?") + 4));
                    cb(food)

                    if (index == lenn - 1) {
                        finished()
                    }
                })

            })
        });
    });
}


var mysql = require('mysql');

var con = mysql.createConnection({
    host: "gymrut.com",
    user: "slavadev",
    password: "slavadev",
    database: "scape"
});

console.log("Reading file.... (This may take a while)")

var lines = fs.readFileSync("ids.txt").toString().split(/\r?\n/)

console.log("Done reading file!")

con.connect(function (err) {
    if (err) throw err;
    console.log("Connected!");

    //Keep connection open
    setTimeout(() => {

        con.query("select * from nutrition limit 1")
    }, 5000)



    var calls = [];


    var tasks = lines.map((line) => (
        (callback) => {
            analyse(line, callback, (food) => {
                var sql = "INSERT INTO nutrition SET ?";
                con.query(sql, food, function (err, result) {
                    console.log("1 record inserted");
                });

            })
        }
    ));


    require("async.parallellimit")(tasks, 50, function () {
    });


});


