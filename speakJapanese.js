var igoWorker;
try {
	igoWorker = new Worker('igoWorker.js');
} catch(e) {
	console.error('warning: no worker support');
}

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

$(document).ready(function() {
	function event(data) {
		$(':input').attr('disabled','disabled');
		if(data.event=='downloaded') {
			$('#loading').text('辞書を展開中・・・');
		} else if(data.event=='load') {
			$('#loading').text('準備完了。').removeClass('alert-info').addClass('alert-success');
			$(':input').removeAttr('disabled');
		} else if(data.event=="result" && data.method=="parseNBest") {
			var nodes = data.morpheme[0];
			var result = '';
			for(var i=0;i<nodes.length;i++) {
				var feature = nodes[i].feature.split(','),
					surface = nodes[i].surface,
					ret = feature.pop();

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
					case '…':
					case '―':
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
			$(':input').removeAttr('disabled');
		} else if(data.event=="error") {
			$('#loading').text('エラー発生').removeClass('alert-info').addClasss('alert-danger');
		}
	}

	// ipadic.zipを読み込む
	var xhr = new XMLHttpRequest();
	xhr.open('GET', 'ipadic.zip', true);
	xhr.addEventListener('load', function(ev) {
		event({event: 'downloaded'});
		var input = new Uint8Array(xhr.response);
		// Worker側で解凍処理
		igoWorker.postMessage({method: 'setdic', dic: input});
	});
	xhr.responseType = 'arraybuffer';
	xhr.send();

	igoWorker.addEventListener('message', function(e) {event(e.data);});
	igoWorker.addEventListener('error', function() {event({event:'error'});});

	$('#speak').click(function(){
		igoWorker.postMessage({method: 'parseNBest', text: $('#text').val().toTwoByteAlphaNumeric().replace(/[\n\r]/g,"。").replace(/[\s]/g,""), best: 3});
		return false;
	});
});