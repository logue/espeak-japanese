$(document).ready(function() {

	// 半角英数字文字列を全角文字列に変換する
	String.prototype.toTwoByteAlphaNumeric = function(){
		return this.replace(/[A-Za-z0-9]/g, function(s) {
			return String.fromCharCode(s.charCodeAt(0) + 0xFEE0);
		});
	}

	// 全角英数字文字列を半角文字列に変換する
	String.prototype.toOneByteAlphaNumeric = function(){
		return this.replace(/[Ａ-Ｚａ-ｚ０-９]/g, function(s) {
			return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
		});
	}

	function event(data) {
		if(data.event=='downloaded') {
			$('#loading').text('辞書を展開中・・・');
		} else if(data.event=='load') {
			$('#loading').hide();
		} else if(data.event=="result" && data.method=="parseNBest") {
			var nodes = data.morpheme[0];
			var result = '';
			for(var i=0;i<nodes.length;i++) {
				var feature = nodes[i].feature.split(',');
				var surface = nodes[i].surface;
				var ret = feature.pop();

				switch (surface) {
					case '（':
					case '(':
						ret = 'かっこ、';
						break;
					case '）':
					case ')':
						ret = 'かっことじ。';
						break;
					case '　':
						ret = '、';
						break;
					case '～':
						ret = 'から';
						break;
					default:
						if (ret === '*'){
							if (feature[1] === '一般' || feature[1] === '固有名詞'){
								ret = surface.toOneByteAlphaNumeric();
							}else if (surface === '-') {
								ret = 'の、';
							}else if (surface === '&'){
								ret = 'あんど';
							}else{
								console.log(feature[1],surface);
							}
						}else if (ret === ''){
							console.log(surface);
						}
						break;
				}
				result += ret + '　';
			}
			speak(result, { amplitude: $('#amplitude').val(), wordgap: $('#wordgap').val(), pitch: $('#pitch').val(), speed: $('#speed').val() });
				console.log(result);
		} else if(data.event=="error") {
			$('#loading').text('エラー発生');
		}
	}

	

	var worker = new Worker('web.js');
	igo.getServerFileToArrayBufffer("ipadic.zip", function(buffer) {
		try {
			event({event: 'downloaded'});
			var blob = new Blob([new Uint8Array(buffer)]);
			worker.postMessage({method: 'setdic', dic: blob});
		} catch(e) {
			console.error(e.toString());
			event({event:"error"});
		}
	});

	worker.addEventListener("message", function(e) {event(e.data);});
	worker.addEventListener("error", function() {event({event:"error"});});

	
	$('#speak').click(function(){
		worker.postMessage({method: 'parseNBest', text: $('#text').val(), best: 3});
		return false;
	});
});
