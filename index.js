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

function analyse(id, resume, cb) {
    request(`http://www.myfitnesspal.com/food/calories/tostitos-bite-size-corn-chips-${id}`, function (error, response, body) {
        if (error) {
            console.log(error)
            resume()
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
                        resume()
                    }
                })

            })
        });
    });
}



/*fs.readdir("enum", (err, files) => {
    files.forEach((id) => {
        limiter.removeTokens(1, () => {
            analyse(id)
        });
    })
})*/

//analyse(1000002, ()=>{}, (food)=>console.log(food));

var mysql = require('mysql');

var con = mysql.createConnection({
    host: "gymrut.com",
    user: "slavadev",
    password: "slavadev",
    database: "scape"
});

con.connect(function (err) {
    if (err) throw err;
    console.log("Connected!");


    var lineNr = 0;
    var startAt = 0;
    var s = fs.createReadStream('../enum/items.txt')
        .pipe(es.split())
        .pipe(es.mapSync(function (line) {
            lineNr += 1;
            if (lineNr < startAt) return;
            // pause the readstream
            s.pause();

            console.log(line)
            analyse(line, s.resume, (food) => {
                console.log(food)


                var sql = "INSERT INTO nutrition SET ?";
                con.query(sql, food, function (err, result) {
                    if (err) throw err;
                    console.log("1 record inserted");
                });

                //fs.writeFile("foods/" + food["Food ID"] + "." + food["Weight ID"] + ".json", JSON.stringify(food), (err) => console.log(err ? err : food.Name + " OK"));
            })

            // resume the readstream, possibly from a callback
            //s.resume();
        })
            .on('error', function (err) {
                console.log('Error while reading file.', err);
            })
            .on('end', function () {
                console.log('Read entire file.')
            })
        );


});


