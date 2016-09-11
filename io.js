
module.exports = function(io, options) {
	var dataCache = options.dataCache;
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
	        pushData();
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
	        pushData();
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
			        pushData();
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
		console.log('sendClient', JSON.stringify(dataCache));
	    io.emit('data', dataCache);
	}

	function pushData(){
		options.pushData && options.pushData();
		sendClient();
	}
}
