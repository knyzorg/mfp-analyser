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
            var portion = $(this).text()
            var wid = $(this).val();
            request(`http://www.myfitnesspal.com/food/calories/${id}`, function (error, response, body) {
                getData(id, wid, (food) => {


                    console.log("Running", id)
                    var $ = cheerio.load(body);
                    food["Name"] = $(".main-title").text().substr(13)
                    food["Weight ID"] = wid;
                    food["Portion"] = portion;
                    food["Brand"] = brand;
                    food["Food ID"] = $($("link[rel=alternate]")[27]).attr("href").substr($($("link[rel=alternate]")[27]).attr("href").indexOf("?") + 4, $($("link[rel=alternate]")[27]).attr("href").indexOf("&") - ($($("link[rel=alternate]")[27]).attr("href").indexOf("?") + 4));
                    cb(food)

                    if (index == lenn - 1) {
                        finished()
                        fs.appendFile("finished.txt", "\r\n" + id, ()=>{})
                    }
                })

            })
        });
    });
}

console.log("Reading files.... (This may take a while)")
var lines = fs.readFileSync("ids.txt").toString().split(/\r?\n/)
var used = fs.readFileSync("finished.txt").toString().split(/\r?\n/)

console.log("Filtering data...")

var list = lines.filter((line)=>(used.indexOf(line) === -1))

console.log("Done reading file!")

console.log("Assigning jobs to queue... (This will taking a fucking long while)")

var calls = [];
var queries = 0;
var time = 0;

setInterval(()=>{
    time++
    console.log(queries, "in", time*5, "seconds")
    console.log("Averaging" ,queries/time/5, "per second")
}, 5000)


var tasks = list.map((line) => (
    (callback) => {
        analyse(line, callback, (food) => {
            //console.log("Processing", line)
            var sql = "INSERT INTO nutrition SET ?";
            /*con.query(sql, food, function (err, result) {
                console.log(err ? err: "1 record inserted");
            });*/
            var query = ('\
            INSERT IGNORE INTO `scape`.`nutrition` (`Calories`, `Total Fat`, `Sodium`, `Potassium`, `Saturated`, `Total Carbs`, `Polyunsaturated`, `Dietary Fiber`, `Monounsaturated`, `Sugars`, `Trans`, `Protein`, `Cholesterol`, `Vitamin A`, `Calcium`, `Vitamin C`, `Iron`, `Name`, `Weight ID`, `Food ID`, `Portion`, `Brand`) VALUES' +
            `("${sqlesc(food["Calories"])}", "${sqlesc(food["Total Fat"])}", "${sqlesc(food["Sodium"])}", "${sqlesc(food["Potassium"])}", "${sqlesc(food["Saturated"])}", "${sqlesc(food["Total Carbs"])}", "${sqlesc(food["Polyunsaturated"])}", "${sqlesc(food["Dietary Fiber"])}", "${sqlesc(food["Monounsaturated"])}", "${sqlesc(food["Sugars"])}", "${sqlesc(food["Trans"])}", "${sqlesc(food["Protein"])}", "${sqlesc(food["Cholesterol"])}", "${sqlesc(food["Vitamin A"])}", "${sqlesc(food["Calcium"])}", "${sqlesc(food["Vitamin C"])}", "${sqlesc(food["Iron"])}", "${sqlesc(food["Name"])}", "${sqlesc(food["Weight ID"])}", "${sqlesc(food["Food ID"])}", "${sqlesc(food["Portion"])}", "${sqlesc(food["Brand"])}");`)
            fs.appendFile("queries.txt",query, ()=>{queries++});
        })
    }
));

console.log("All done!")
    require("async.parallellimit")(tasks, 50, function () {
    });



function sqlesc(a) {
    return a.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, function (a) {
        switch (a) {
            case "\0":
                return "\\0";
            case "\b":
                return "\\b";
            case "\t":
                return "\\t";
            case "":
                return "\\z";
            case "\n":
                return "\\n";
            case "\r":
                return "\\r";
            case '"':
            case "'":
            case "\\":
            case "%":
                return "\\" + a
        }
    })
}