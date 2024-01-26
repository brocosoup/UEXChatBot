const logger = require('./logger.cjs');
const fs = require('node:fs');
var locale;
var receivedUpdate = false;

function setLocale(localeToSet) {
    locale = localeToSet;
}

module.exports = {
    addToDatabase, getShipPrice, getCommoditiesPrice, computeMessage, refreshAPI, setLocale, saveData, receivedUpdate
}

function addToDatabase(ressource) {
    if (ressource.length >= 3 && ressource.length <=4)
        return setCommoditiesPrice(ressource[0], ressource[1], ressource[2], ressource[3]);
    else
        return undefined;
}

var jsonShipData = {};
var jsonCommoditiesData = {};
var jsonTradeportsData = {};

function refreshAPI(api_settings) {
    let apicalls = [
        'https://portal.uexcorp.space/api/ships/',
        'https://portal.uexcorp.space/api/tradeports/system/ST/',
        'https://portal.uexcorp.space/api/commodities/'
    ];
    let requests = apicalls.map(async function (url) {
        const response = await fetch(url, api_settings);
        return await response.json();
    });

    Promise.all(requests)
        .then((results) => {
            jsonShipData = results[0];
            if (jsonShipData['code'] == 200) {
                fs.writeFile("jsonShipData.json", JSON.stringify(jsonShipData), (err) => {
                    if (err)
                        logger.log(err, 2);
                    else
                        logger.log("jsonShipData.json updated successfully", -1);
                });
            } else {
                var rawShipdata = fs.readFileSync('jsonShipData.json');
                jsonShipData = JSON.parse(rawShipdata);
                logger.log('Using local data for jsonShipData', -1);
            }

            jsonCommoditiesData = results[2];
            if (jsonCommoditiesData['code'] == 200) {
                fs.writeFile("jsonCommoditiesData.json", JSON.stringify(jsonCommoditiesData), (err) => {
                    if (err)
                        logger.log(err, 2);
                    else
                        logger.log("jsonCommoditiesData.json updated successfully", -1);
                });
            } else {
                var rawCommoditiesdata = fs.readFileSync('jsonCommoditiesData.json');
                jsonCommoditiesData = JSON.parse(rawCommoditiesdata);
                logger.log('Using local data for jsonCommoditiesData', -1);
            }

            jsonTradeportsData = results[1];
            if (jsonTradeportsData['code'] == 200) {
                fs.writeFile("jsonTradeportsData.json", JSON.stringify(jsonTradeportsData), (err) => {
                    if (err)
                        logger.log(err, 2);
                    else
                        logger.log("jsonTradeportsData.json updated successfully", -1);
                });
            } else {
                var rawTradeportsdata = fs.readFileSync('jsonTradeportsData.json');
                jsonTradeportsData = JSON.parse(rawTradeportsdata);
                logger.log('Using local data for jsonTradeportsData', -1);
            }
        }).catch(function (err) {
            logger.log(err, 2);
        })

}

function computeMessage(message, table) {
    var computedMessage = message;
    var argNum = 1;

    for (var arg in table) {
        computedMessage = computedMessage.replace('%%' + argNum, table[arg])
        argNum++;
    }
    return computedMessage;
}

function getShipList(shipName) {
    var shipsList = []
    for (var ship in jsonShipData.data) {
        if (jsonShipData.data[ship]['name'].toLowerCase() == shipName.toLowerCase()) {
            shipsList.push(jsonShipData.data[ship]['name']);
            return shipsList; //we have a match, we can exit right now!
        } else if (jsonShipData.data[ship]['name'].toLowerCase().includes(shipName.toLowerCase())) {
            shipsList.push(jsonShipData.data[ship]['name']);
        }
    }
    return shipsList;
}

function getListCommodities(commName) {
    let listCommodities = [];
    for (var commodID in jsonCommoditiesData.data) {
        if (commName == undefined) {
            listCommodities.push({ name: jsonCommoditiesData.data[commodID]['name'], code: jsonCommoditiesData.data[commodID]['code'] });
        } else if (jsonCommoditiesData.data[commodID]['name'].toLowerCase() == commName.toLowerCase()) {
            listCommodities = [{ name: jsonCommoditiesData.data[commodID]['name'], code: jsonCommoditiesData.data[commodID]['code'] }];
            return listCommodities;
        } else if (jsonCommoditiesData.data[commodID]['name'].toLowerCase().includes(commName.toLowerCase())) {
            listCommodities.push({ name: jsonCommoditiesData.data[commodID]['name'], code: jsonCommoditiesData.data[commodID]['code'] });
        }
    }
    return listCommodities;
}

function getListLocation(locName) {
    let listLoc = [];
    for (var locID in jsonTradeportsData.data) {
        if (locName == undefined) {
            listLoc.push(jsonTradeportsData.data[locID].name);
        } else if (jsonTradeportsData.data[locID].name.toLowerCase() == locName.toLowerCase()) {
            listLoc = [jsonTradeportsData.data[locID].name];
            return listLoc;
        } else if (jsonTradeportsData.data[locID]['name'].toLowerCase().includes(locName.toLowerCase())) {
            listLoc.push(jsonTradeportsData.data[locID].name);
        }
    }
    return listLoc;
}

function getShipPrice(shipName, type, max) {
    var listShips = getShipList(shipName);
    var nbShips = listShips.length;
    var message = '';
    if (listShips.length == 1) {
        var ListOfShipsLocs = [];
        var nbLocs = listShips.length;
        var message = '';
        if (nbLocs == 0) {
            // var message = 'Le ' + listShips[0] + ' n\'est pas disponible à l\'achat en jeu.';
            if (type == 'buy')
                var message = computeMessage(locale.ship_not_available_buy, [listShips[0]]);
            else if (type == 'rent')
                var message = computeMessage(locale.ship_not_available_rent, [listShips[0]]);
        } else {
            for (var ship in jsonShipData.data) {
                var locID = 1;
                if (jsonShipData.data[ship]['name'].toLowerCase() == listShips[0].toLowerCase()) {
                    for (var loc in jsonShipData.data[ship][type + '_at']) {
                        var apiShipName = jsonShipData.data[ship]['name'];
                        var locSystemName = jsonShipData.data[ship][type + '_at'][loc]['system_name'];
                        var locCityName = jsonShipData.data[ship][type + '_at'][loc]['city_name'];
                        if (locCityName == undefined)
                            locCityName = jsonShipData.data[ship][type + '_at'][loc]['tradeport'];
                        if (locCityName == undefined)
                            locCityName = jsonShipData.data[ship][type + '_at'][loc]['planet_name'];
                        var locStoreName = '(' + jsonShipData.data[ship][type + '_at'][loc]['store_name'] + ')';
                        if (locStoreName == '(null)')
                            locStoreName = '';
                        var apiShipPrice = jsonShipData.data[ship][type + '_at'][loc]['price'].toLocaleString('en-US')

                        //apiShipName, locSystemName, locCityName, locStoreName, apiShipPrice, type
                        ListOfShipsLocs.push({ 'apiShipName': apiShipName, 'locSystemName': locSystemName, 'locCityName': locCityName, 'locStoreName': locStoreName, 'apiShipPrice': apiShipPrice, 'type': type })
                    }

                }
            }
            ListOfShipsLocs.sort(compareShipByPriceDesc);
            var limit = 0;
            for (var locality in ListOfShipsLocs) {
                if (locality >= max) {
                    break;
                }
                if (ListOfShipsLocs.length == 1) {

                    // message = '(' + type + ') Le ' + apiShipName + ' est à ' + locSystemName + ' ' + locCityName + ' ' + locStoreName + ' au prix de ' + apiShipPrice;
                    message = computeMessage(locale.ship_available_oneloc, [ListOfShipsLocs[locality].apiShipName, ListOfShipsLocs[locality].locSystemName, ListOfShipsLocs[locality].locCityName, ListOfShipsLocs[locality].locStoreName, ListOfShipsLocs[locality].apiShipPrice, ListOfShipsLocs[locality].type]);
                }
                else if (ListOfShipsLocs.length > 1) {
                    if (locality == 0) {
                        message = computeMessage(locale.ship_available_firstloc, [ListOfShipsLocs[locality].apiShipName, ListOfShipsLocs[locality].locSystemName, ListOfShipsLocs[locality].locCityName, ListOfShipsLocs[locality].locStoreName, ListOfShipsLocs[locality].apiShipPrice, ListOfShipsLocs[locality].type]);
                    } else if (locality + 1 == ListOfShipsLocs.length) {
                        message = message + computeMessage(locale.ship_available_lastloc, [ListOfShipsLocs[locality].apiShipName, ListOfShipsLocs[locality].locSystemName, ListOfShipsLocs[locality].locCityName, ListOfShipsLocs[locality].locStoreName, ListOfShipsLocs[locality].apiShipPrice, ListOfShipsLocs[locality].type]);
                    } else {
                        message = message + computeMessage(locale.ship_available_nextloc, [ListOfShipsLocs[locality].apiShipName, ListOfShipsLocs[locality].locSystemName, ListOfShipsLocs[locality].locCityName, ListOfShipsLocs[locality].locStoreName, ListOfShipsLocs[locality].apiShipPrice, ListOfShipsLocs[locality].type]);
                    }
                }
            }
        }
    } else if (listShips.length > 1 && listShips.length < 10) {
        // message = 'Désolé, vous devez sélectionner un seul ship ' + listShips;
        message = computeMessage(locale.ship_only_one, [listShips]);
    } else if (listShips.length >= 10) {
        // message = 'Désolé, j\'ai trouvé trop de ships correspondant à ce nom (' + listShips.length + ')';
        message = computeMessage(locale.ship_too_much, [listShips.length]);
    } else {
        // message = 'Désolé, je n\'ai trouvé aucun ship correspondant à ce nom. Je ne saurais que vous conseiller d\'acheter un Carrack!';
        message = computeMessage(locale.ship_no_ship, []);
    }
    return message
}

function getCommoditiesPrice(commName, type, max) {
    const listCommodities = getListCommodities(commName)
    var message = ''
    if (listCommodities.length == 1) {
        var ListOfCommodities = [];
        for (var tradeport in jsonTradeportsData.data) {
            for (var commodity in jsonTradeportsData.data[tradeport]['prices']) {
                if (jsonTradeportsData.data[tradeport]['prices'][commodity]['name'] != null && jsonTradeportsData.data[tradeport]['prices'][commodity]['name'].toLowerCase() == listCommodities[0].name.toLowerCase() && jsonTradeportsData.data[tradeport]['prices'][commodity]['price_' + type] > 0) {
                    var loc = jsonTradeportsData.data[tradeport]['planet']
                    if (jsonTradeportsData.data[tradeport]['satellite'] != null && jsonTradeportsData.data[tradeport]['satellite'] != '') {
                        loc = jsonTradeportsData.data[tradeport]['satellite']
                    }
                    if (jsonTradeportsData.data[tradeport]['city'] != null && jsonTradeportsData.data[tradeport]['city'] != '') {
                        loc = jsonTradeportsData.data[tradeport]['city']
                    }
                    ListOfCommodities.push({ 'name': jsonTradeportsData.data[tradeport]['prices'][commodity]['name'], 'tradeport': jsonTradeportsData.data[tradeport]['name'], 'code': jsonTradeportsData.data[tradeport]['name_short'], 'localisation': loc, 'price': jsonTradeportsData.data[tradeport]['prices'][commodity]['price_' + type] })
                }
            }
        }
        if (type == 'buy')
            ListOfCommodities.sort(compareComByPriceDesc);
        else if (type == 'sell')
            ListOfCommodities.sort(compareComByPriceAsc);

        for (var commodity in ListOfCommodities) {
            // ListOfCommodities[commodity]
            if (commodity >= max) {
                break;
            }
            if (message == '') {
                message = computeMessage(locale.commodities_found, [ListOfCommodities[commodity]['name']])
            }

            if (type == 'buy')
                message = message + ' ' + computeMessage(locale.commodities_buy, [ListOfCommodities[commodity]['code'], ListOfCommodities[commodity]['localisation'], ListOfCommodities[commodity]['price'].toLocaleString('en-US')])
            else
                message = message + ' ' + computeMessage(locale.commodities_sell, [ListOfCommodities[commodity]['code'], ListOfCommodities[commodity]['localisation'], ListOfCommodities[commodity]['price'].toLocaleString('en-US')])


        }
    } else if (listCommodities.length < 10 && listCommodities.length > 1) {
        message = computeMessage(locale.commodities_list, [getListofName(listCommodities)]);
    } else if (listCommodities.length >= 10) {
        message = computeMessage(locale.commodities_too_much, [getListofName(listCommodities)]);
    } else if (listCommodities.length == 0) {
        message = computeMessage(locale.not_found, [getListofName(listCommodities)]);
    }
    return message;
}

function getListofName(list) {
    var res = ""
    for (var id in list) {
        if (res == '')
            res = list[id].name
        else
            res = res + ',' + list[id].name
    }
    return res;
}

function setCommoditiesPrice(commName, typeSet, location='', price) {
    const listCommodities = getListCommodities(commName.replace(/^ */g, '').replace(/ *$/g, ''));
    const listLoc = getListLocation(location.replace(/^ */g, '').replace(/ *$/g, ''));
    const type = typeSet.replace(/ /g, ''.replace(/^ */g, '').replace(/ *$/g, ''));

    var message = '';

    if (listCommodities.length < 10 && listCommodities.length > 1) {
        message = computeMessage(locale.commodities_list, [getListofName(listCommodities)]);
        return message;
    } else if (listCommodities.length >= 10) {
        message = computeMessage(locale.commodities_too_much, [getListofName(listCommodities)]);
        return message;
    } else if (listCommodities.length == 0) {
        message = computeMessage(locale.not_found, [getListofName(listCommodities)]);
        return message;
    }

    if (listLoc.length < 10 && listLoc.length > 1) {
        message = computeMessage(locale.commodities_list, [listLoc]);
        return message;
    } else if (listLoc.length >= 10) {
        message = computeMessage(locale.commodities_too_much, [listLoc]);
        return message;
    } else if (listLoc.length == 0) {
        message = computeMessage(locale.not_found, [listLoc]);
        return message;
    }

    if (listCommodities.length == 1 && listLoc.length == 1) {
        for (var tradeport in jsonTradeportsData.data) {
            var found = false;
            if (jsonTradeportsData.data[tradeport]['name'] == listLoc[0]) {
                for (var commodity in jsonTradeportsData.data[tradeport]['prices']) {
                    if (jsonTradeportsData.data[tradeport]['prices'][commodity]['name'] != null && jsonTradeportsData.data[tradeport]['prices'][commodity]['name'].toLowerCase() == listCommodities[0].name.toLowerCase() && (type == 'buy' || type == 'sell')) {
                        found = true;
                        if (type == 'buy' && jsonTradeportsData.data[tradeport]['prices'][commodity]['price_' + type] > 0)
                            message = computeMessage(locale.commodity_get_buy, [jsonTradeportsData.data[tradeport]['prices'][commodity]['name'], jsonTradeportsData.data[tradeport]['name'], jsonTradeportsData.data[tradeport]['prices'][commodity]['price_' + type]]);
                        else if (type == 'sell' && jsonTradeportsData.data[tradeport]['prices'][commodity]['price_' + type] > 0)
                            message = computeMessage(locale.commodity_get_sell, [jsonTradeportsData.data[tradeport]['prices'][commodity]['name'], jsonTradeportsData.data[tradeport]['name'], jsonTradeportsData.data[tradeport]['prices'][commodity]['price_' + type]]);

                        if (price != undefined && price != '') {
                            jsonTradeportsData.data[tradeport]['prices'][commodity]['price_' + type] = price;
                            receivedUpdate = true;
                            if (type == 'buy')
                                message = computeMessage(locale.commodity_set_buy, [jsonTradeportsData.data[tradeport]['prices'][commodity]['name'], jsonTradeportsData.data[tradeport]['name'], price]);
                            else if (type == 'sell')
                                message = computeMessage(locale.commodity_set_sell, [jsonTradeportsData.data[tradeport]['prices'][commodity]['name'], jsonTradeportsData.data[tradeport]['name'], price]);
                        }

                    }
                }
                if (found == false && type == 'buy' && price != undefined && price != '') {
                    const res = {
                        name: listCommodities[0].name,
                        price_buy: price,
                        price_sell: 0,
                    }
                    jsonTradeportsData.data[tradeport]['prices'][listCommodities[0].code] = res;
                    message = computeMessage(locale.commodity_set_buy, [listCommodities[0].name, jsonTradeportsData.data[tradeport]['name'], price]);
                } else if (found == false && type == 'sell' && price != undefined && price != '') {
                    const res = {
                        name: listCommodities[0].name,
                        price_buy: 0,
                        price_sell: price,
                    }
                    jsonTradeportsData.data[tradeport]['prices'][listCommodities[0].code] = res;
                    message = computeMessage(locale.commodity_set_sell, [listCommodities[0].name, jsonTradeportsData.data[tradeport]['name'], price]);
                }
                break;
            }
        }
    }
    if (message== '' )
    {
        message = computeMessage(locale.not_found, []);
    }
    return message;
}

function compareComByPriceDesc(a, b) {

    if (a.price < b.price) {
        return -1;
    }
    if (a.price > b.price) {
        return 1;
    }
    return 0;
}
function compareComByPriceAsc(a, b) {

    if (a.price < b.price) {
        return 1;
    }
    if (a.price > b.price) {
        return -1;
    }
    return 0;
}

function compareShipByPriceDesc(a, b) {

    if (a.apiShipPrice < b.apiShipPrice) {
        return -1;
    }
    if (a.apiShipPrice > b.apiShipPrice) {
        return 1;
    }
    return 0;
}
function compareShipByPriceAsc(a, b) {

    if (a.apiShipPrice < b.apiShipPrice) {
        return 1;
    }
    if (a.apiShipPrice > b.apiShipPrice) {
        return -1;
    }
    return 0;
}



function saveData()
{
    if (!receivedUpdate)
        return;
    receivedUpdate = false;
    logger.log('Saving Data',-1);
    fs.writeFile("jsonShipDataUpdate.json", JSON.stringify(jsonShipData), (err) => {
        if (err)
            logger.log(err, 2);
        else
            logger.log("jsonShipDataUpdate.json updated successfully", -1);
    });
    
}

