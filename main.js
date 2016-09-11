/*jslint node:true, vars:true, bitwise:true, unparam:true */
/*jshint unused:true */

var os = require('os');

var port = 3008;
var request = require('request')
var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var path = require('path');
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname + '/client', 'index.html'));
});
app.use(express.static(__dirname + '/client'));
app.use('/client', express.static(__dirname + '/client'));

app.use('/h', function(req, res, next){
    reloadH();
    res.json({"status": 200});
});

var dataCache = {version: 1, agents: [], server: []};

app.use('/update', function(req, res, next){
    if (typeof req.body == 'object') {
        var body = req.body;
        for (var key in body) {dataCache[key] = body[key];}
    }
    res.json({"status": 200});
});

io.on('connection', function(socket) {

    socket.on('agent add', function(data) {
        console.log('agent add', data);
        var agents = dataCache.agents, index = 0;
        for (; index < agents.length; index++) {
            var agent = agents[index];
            console.log(agent);
            if (agent.ip == data.agent) {
                agent.name = data.name;
                break;
            }
        }
        if (index >= agents.length) {
            data.status = data.status || [];
            dataCache.agents.push(data);
        }

        dataCache.version++;
        runMasterPush();
    });
    
    socket.on('status add', function(data) {
        console.log('status add', data);

        var agents = dataCache.agents, index = 0;
        var agent;
        for (; index < agents.length; index++) {
            agent = agents[index];
            if (agent.ip == data.ip) {
                break;
            }
        }
        if (agent) {
            agent.status.push(data);
        }
        dataCache.version++;
        runMasterPush();
    });

    socket.on('status set', function(data) {
        console.log('status set', data);

        var agents = dataCache.agents, index = 0;
        var agent;
        for (; index < agents.length; index++) {
            agent = agents[index];
            if (agent.ip == data.agent) {
                break;
            }
        }
        if (agent) {
            var status;
            for (; index < agent.status.length; index++) {
                status = agent.status[index];
                if (status.link == data.link) {
                    break;
                }
            }
            if (status) {
                status.value = data.value;
                dataCache.version++;
                runMasterPush();
            } else {
                console.log("no status");
            }
        } else {
            console.log('no agent');
        }
    });

    sendClient();
});

function sendClient(){
    _runTask();
    console.log('sendClient', JSON.stringify(dataCache));
    io.emit('data', dataCache);
}

http.listen(port, function(){
    console.log('Web server Active listening on *:' + port + ' ' + getLocalIP());
});

var hTimer;
function reloadH(){
    clearTimeout(hTimer);
    hTimer = setTimeout(function(){

        upMaster();
        reloadH();
    }, 6 * 1000);
}
reloadH();

function upMaster(){
    var localIP = getLocalIP();
    console.log("upMaster localIP: " + localIP);
    
    if (dataCache.server.length >= 2 && dataCache.server[1] == localIP) {
        var index = dataCache.server.indexOf(localIP);
        if (index != -1) {
            dataCache.server.splice(index, 1);
        }
        dataCache.server.splice(0, 0, localIP);
        sendClient();
        runMaster();
    }

    if (dataCache.server.length == 0) {
        dataCache.server.push(localIP);
        dataCache.agents.push({
            name: '隔壁老王',
            ip: localIP,
            status: [
                {
                    name: '卧室温度',
                    link: 'A0',
                    linkType: '温度',
                    value: ''
                },
                {
                    name: '卧室台灯',
                    link: 'D6',
                    linkType: '灯',
                    value: ''
                },
                {
                    name: '客厅温度',
                    link: 'A0',
                    linkType: '温度',
                    value: ''
                },
                {
                    name: '客厅灯',
                    link: 'D8',
                    linkType: '灯',
                    value: ''
                },
                {
                    name: '空气质量',
                    link: 'D7',
                    linkType: '空气',
                    value: '良'
                },
                {
                    name: '空气湿度',
                    link: 'D7',
                    linkType: '湿度',
                    value: '良'
                }
            ]
        });
        sendClient();
        runMaster();
    }
}

var masterTimer;
function runMaster() {
    function done(){
        runMasterPush();
        runMaster();
    }

    clearTimeout(masterTimer);
    masterTimer = setTimeout(function(){
        var localIP = getLocalIP() || '172.16.1.175';
        var localIPs = localIP.split('.');

        var doneIndex = 0;
        for (var i = 0; i < 255; i++) {
            localIPs[3] = i;
            var ip = localIPs.join('.');
            doneIndex++;

            (function(ip){
                var url = 'http://' + ip + ':' + port + '/h';
                request({ method: 'GET', url: url, timeout: 2 * 1000}, function (e, r, body) {
                    doneIndex--;
                    if (body) {
                        var index = dataCache.server.indexOf(ip);
                        if (index == -1) {
                            dataCache.server.push(ip);
                            dataCache.agents.push({
                                name: ip,
                                ip: ip,
                                status: []
                            });
                        }
                    }
                    if (doneIndex == 0) {
                        done();
                    }
                });
            })(ip);
        }
    }, 3 * 1000);
}

function runMasterPush(){
    var doneIndex = 0;
    var formData = JSON.parse(JSON.stringify(dataCache));

    function done(){
        sendClient();
    }
    for (var i = 0; i < formData.server.length; i++) {
        var ip = formData.server[i];
        doneIndex++;
        (function(ip){
            var url = 'http://' + ip + ':' + port + '/update';
            request({ method: 'POST', url: url, json:true, body: formData, timeout: 2 * 1000}, function (e, r, body) {
                doneIndex--;
                if (doneIndex == 0) {
                    done();
                }
            });
        })(ip);
    }
}

function getLocalIP() {
    var map = [];
    var ifaces = os.networkInterfaces();
    
    if (ifaces['wlan0']) {
        var iface = ifaces['wlan0'];
        return iface[0].address;
    } else {
        return '';
    }
}

var taskTimer;
function runTask(){
    clearTimeout(taskTimer);
    taskTimer = setTimeout(function(){
        _runTask();
    }, 1000);
}


function _runTask(){
    clearTimeout(taskTimer);
    var localIP = getLocalIP();
    console.log('start task', JSON.stringify(dataCache));

    var agents = dataCache.agents, index = 0;
    var agent;
    for (; index < agents.length; index++) {
        agent = agents[index];
        if (agent.ip == localIP) {
            break;
        }
    }
    if (agent) {
        require('./task.js')(dataCache, agent);
    }
    runTask();
}
runTask();
// var ip = '127.0.0.1';
// var url = 'http://' + ip + ':' + port + '/update';
// request({ method: 'POST',    json:true,
//  url: url, body: dataCache, timeout: 2 * 1000}, function (e, r, body) {
//     console.log(e, body);
// });
