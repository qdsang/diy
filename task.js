
var groveSensor;
try{
	groveSensor = require('jsupm_grove');
}catch(ex) {}


var isRuning = false;
var runTimer;
module.exports = run;

function run(dataCache, agent) {
	if (!groveSensor) return;
	if (isRuning) {
		clearTimeout(runTimer);
		runTimer = setTimeout(function(){
			run(dataCache, agent);
		}, 80);
		return ;
	}
	isRuning = true;

    var isChange = false;
    console.log("start task");

	for (var i = 0; i < agent.status.length; i++) {
		var status = agent.status[i];

		if (!status.link) {
			continue;
		}
		var link = parseInt(status.link.substr(1), 10);
		if (status.linkType == '灯') {
			var led = new groveSensor.GroveLed(parseInt(link, 10));

	        if ( status.value ) {
	            led.on();
				console.log("灯：开", status.value);
	        } else {
	            led.off();
				console.log("灯：关", status.value);
	        }
		}else if (status.linkType == '温度') {
			var temp = new groveSensor.GroveTemp(link);
			status.value = temp.value();
			console.log("温度：", temp);
		}
	}
	isRuning = false;
}

