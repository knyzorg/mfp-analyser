var request = require('request');
const cheerio = require('cheerio')
var fs = require('fs')
    , util = require('util')
    , stream = require('stream')
    , es = require('event-stream');


function getData(id, wid, cb) {
    request(`http://www.myfitnesspal.com/food/update_nutrition_facts_table/?id=${id}&quantity=1&weight_id=${wid}`, function (error, response, body) {
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

function analyse(id, resume,cb) {
    request(`http://www.myfitnesspal.com/food/calories/tostitos-bite-size-corn-chips-${id}`, function (error, response, body) {
        var $ = cheerio.load(body);
        console.log($(".select option").length)
        $(".select option").each(function (index, elem, arr) {
            var wid = $(this).text()
            var portion = $(this).val();
            request(`http://www.myfitnesspal.com/food/calories/${id}`, function (error, response, body) {
                getData(id, wid, (food) => {

                    var $ = cheerio.load(body);
                    console.log()
                    food["Name"] = $(".main-title").text().substr(13)
                    food["Weight ID"] = portion;
                    food["Portion"] = wid;
                    food["Food ID"] = $($("link[rel=alternate]")[27]).attr("href").substr($($("link[rel=alternate]")[27]).attr("href").indexOf("?") + 4, $($("link[rel=alternate]")[27]).attr("href").indexOf("&") - ($($("link[rel=alternate]")[27]).attr("href").indexOf("?") + 4));
                    cb(food)

                    if (index == arr.length-1){
                        resume()
                    }
                })

            })
        });
    });
}
var RateLimiter = require('limiter').RateLimiter;
var limiter = new RateLimiter(1, 500)



/*fs.readdir("enum", (err, files) => {
    files.forEach((id) => {
        limiter.removeTokens(1, () => {
            analyse(id)
        });
    })
})*/



var lineNr = 0;

var s = fs.createReadStream('../enum/items.txt')
    .pipe(es.split())
    .pipe(es.mapSync(function (line) {

        // pause the readstream
        s.pause();

        lineNr += 1;
        console.log(line)
        analyse(line, s.resume, (food) => {
            console.log(food)
            fs.writeFile("foods/" + food["Food ID"] + "." + food["Weight ID"] + ".json", JSON.stringify(food), (err) => console.log(err ? err : food.Name + " OK"));
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
//getData(, 261680669)
/*
readfiles('../enum', {
    depth: 0
}, function (err, content, filename) {
    if (err) throw err;
    console.log('File ' + filename + ':');
    console.log(content);
});

fs.readdir("../enum", (err, files) => {
    files.forEach((file) => analyse(file, (food) => {
        console.log(food)
        fs.writeFile("foods/" + food["Food ID"] + "." + food["Weight ID"] + ".json", JSON.stringify(food), (err) => (console.log(err ? err : food.Name + " OK")));
    }))

})*/
