// 此文件下载者不用更改，兼容其他域名使用
var Settings = function () {
	var ishttps = 'https:' == document.location.protocol;
	if(ishttps) {
		this.socketServer = 'wss://54.169.152.168:8585';	
	}else{
		this.socketServer = 'ws://54.169.152.168:8585';	
	}
};
