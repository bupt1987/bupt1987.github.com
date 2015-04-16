// 此文件下载者不用更改，兼容其他域名使用
var Settings = function () {
	var ishttps = 'https:' == document.location.protocol;
	if(ishttps) {
		this.socketServer = 'wss://killua.net:8585';	
	}else{
		this.socketServer = 'ws://killua.net:8585';	
	}
};
