var request = require('request');
const cheerio = require('cheerio')
const fs = require('fs')


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

function analyse(id, cb) {
    request(`http://www.myfitnesspal.com/food/calories/tostitos-bite-size-corn-chips-${id}`, function (error, response, body) {
        var $ = cheerio.load(body);
        console.log($(".select option").length)
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
                    food["Food ID"] = $($("link[rel=alternate]")[27]).attr("href").substr($($("link[rel=alternate]")[27]).attr("href").indexOf("?") + 4, $($("link[rel=alternate]")[27]).attr("href").indexOf("&") - ($($("link[rel=alternate]")[27]).attr("href").indexOf("?") + 4));
                    cb(food)
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
analyse(417188839, (food) => {
    console.log(food)
    fs.writeFile("foods/" + food["Food ID"] + "." + food["Weight ID"] + ".json", JSON.stringify(food), (err) => console.log(err ? err : food.Name + " OK"));
})
//getData(, 261680669)

fs.readdir("../enum", (err, file)=>analyse(file, (food) => {
    console.log(food)
    fs.writeFile("foods/" + food["Food ID"] + "." + food["Weight ID"] + ".json", JSON.stringify(food), (err) => (console.log(err ? err : food.Name + " OK")));
}))
