var igoWorker, speakWorker, encoderWorker, audio = new Audio();
try {
  igoWorker = new Worker('igoWorker.js');
  speakWorker = new Worker('speakWorker.js');
  encoderWorker = new Worker('encoderWorker.js');
} catch(e) {
  console.error('warning: no worker support');
}

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
		$(':input').attr('disabled','disabled');
		switch (data.event) {
			case 'loading':
				$('#loading').text('辞書をダウンロード中・・・');
				break;
			case 'parsing':
				$('#loading').text('辞書を展開中・・・');
				break;
			case 'ready':
				$('#loading').text('準備完了').addClass('alert-success').removeClass('alert-info');
				$(':input').not('.disabled').removeAttr('disabled');
				break;
			case 'result':
			case 'parseNBest':
				if (!data.morpheme) break;
			//	console.log(data);
				speakWorker.postMessage({
					text:getYomi(data.morpheme[0]),
					args: { amplitude: $('#amplitude').val(), wordgap: $('#wordgap').val(), pitch: $('#pitch').val(), speed: $('#speed').val() }
				});
				$(':input').not('.disabled').removeAttr('disabled');
				break;
			case 'error':
				$('#loading').text('エラー発生').addClass('alert-danger').removeClass('alert-info');;
				break;
		}
	}

	function encode64(buffer) {
		var binary = ''
		var bytes = new Uint8Array( buffer )
		var len = bytes.byteLength;
		for (var i = 0; i < len; i++) {
			binary += String.fromCharCode( bytes[ i ] )
		}
		return window.btoa( binary );
	}

	var YOMI_FIELD_NUM = 9;	// ipadic, jdic 8 / jumandic 5 / unidic 9

	function getYomi(nodes){
		var result = '';
		for(var i=0;i<nodes.length;i++) {
			var feature = nodes[i].feature.split(','), surface = nodes[i].surface, ret = '';

		//	console.log(surface, feature);

			switch (surface) {
				case '（':
				case '(':
					ret = '　かっこ、';
					break;
				case '）':
				case ')':
					ret = 'かっことじ。　';
					break;
				case '　':
				case '…':
				case '！':
				case '？':
					ret = '、';
					break;
				case '～':
					ret = 'から';
					break;
				case '-':
					ret = 'の';
					break;
				case '&':
					ret = 'あんど';
					break;
				case '。':
				case 'ー':
					ret = surface + '　';
					break;
				default :
					if (typeof feature[YOMI_FIELD_NUM] !== 'undefined'){
						ret = feature[YOMI_FIELD_NUM];
						if (feature[1].match(/助/)) ret += '　';	// 助詞,助動詞などはスペースをあけて読み方を変える
						break;
					}
					switch (feature[1]) {
						case '一般':
						case '固有名詞':
							ret = surface.toOneByteAlphaNumeric();
							break;
						default:
							if (feature[YOMI_FIELD_NUM] === '*'){
								ret = surface;
							}
							
				//			console.log(feature[1],surface);
							ret = surface;
							break;

					}
			}

			result += ret;
		}
		console.log(result);
		return result;
	}

	function getStr(str){
		return str.toTwoByteAlphaNumeric().replace(/[\n\r]/g,"。").replace(/[\s]/g,"");
	}

	/**
	 * 数字をかなに変換する
	 */
	function parseIntYomi(str){
		var 
		// 読み
			yomi = ['レイ','イチ','ニー','サン','ヨン','ゴー','ロク','ナナ','ハチ','キュー'],
		// 十進読み
			jusshin_kurai = ['','ジュー','ヒャク','セン'],
		// 万進読み
			manshin_kurai = ['','マン','オク','チョー','ケー','ガイ'],
		//数読み
			kazu_yomi = ['','','ニ','サン','ヨン','ゴ','ロク','ナナ','ハチ','キュー'],

			num = ('   ' + str).split(''),

		// 逆から読みに変換していく
			list = [],
			rev = num.reverse();

		//rev += ' ' * 3;
		for (var j = 3; j <= rev.length; j++){
			var temp = word = ''
			
			for (var i = 0; i <= 4; i++){
				if (rev[i] === ' '){
					break;
				}else if (rev[i] !== '0'){
					word = (kazu_yomi[rev[i]] ? kazu_yomi[rev[i]] : '') + (jusshin_kurai[i] ? jusshin_kurai[i] : '');
					switch(i){
						case 1:
							if (rev[0] ==='1') word = 'イチ';
							break;
						case 2:
							if (rev[2] === '3'){
								word = 'サンビャク';
							}else if (rev[2] === '6'){
								word = 'ロッピャク';
							}else if (rev[2] === '8'){
								word = 'ハッピャク';
							}
							break;
						case 3:
							if (rev[3] === '1' && num.length !== 4){
								word = 'イッセン';
							}else if (rev[3] === '3'){
								word = 'サンゼン';
							}else if (rev[3] === '8'){
								word = 'ハッセン';
							}
							break;
					}

					temp = word + temp;
				}
			}
			list.push( temp );
			rev = rev.slice(rev.length,0);
		}

		// 対応範囲外ならば、元の値を数字の羅列として読む
		if (list.length > manshin_kurai.length){
			var tmp;
			for (var i = 0; i <= num.length; i++){
				tmp += num[i].replace(i,yomi[i]); 
			}
			return tmp;
		}

		// 位を付加していく
		var result = ''
		for (var i = 0; i <= list.length; i++){
			if (list[i])
				result = (list[i] ? list[i] : '') + manshin_kurai[i] + result;
		}

		// 結果を返す
		return result;
	}
	
	function parseWav(wav) {
		function readInt(i, bytes) {
			var ret = 0,
				shft = 0;
			while (bytes) {
				ret += wav[i] << shft;
				shft += 8;
				i++;
				bytes--;
			}
			return ret;
		}
		if (readInt(20, 2) != 1) throw 'Invalid compression code, not PCM';
		if (readInt(22, 2) != 1) throw 'Invalid number of channels, not 1';
		return {
			sampleRate: readInt(24, 4),
			bitsPerSample: readInt(34, 2),
			samples: wav.subarray(44)
		};
	}

	speakWorker.onmessage = function(event) {
		if (event.data && audio.canPlayType("audio/wav") !== '') {
			audio.src = 'data:audio/wav;base64,'+encode64(event.data);
			audio.play();
		}else if (audio.canPlayType("audio/mp3")) {
			var data = parseWav(wav);
			encoderWorker.postMessage({ cmd: 'init', config:{
				mode : 3,
				channels:1,
				samplerate: data.sampleRate,
				bitlate: data.bitsPerSample
				}
			});
			
			encoderWorker.postMessage({ cmd: 'encode', buf: Uint8ArrayToFloat32Array(data.samples)});
			
			encoderWorker.onmessage = function(e) {
				console.log(e.data.cmd);
				if (e.data.cmd == 'data') {
					audio.src = 'data:audio/mp3;base64,'+encode64(e.data.buf);
					audio.play();
				}
			};
			encoderWorker.postMessage({ cmd: 'finish'});
		}else{
			alert('Your browser seems not supported to .wav format audio.');
		}
	};

	igoWorker.postMessage({method: 'init', file:'unidic.zip'});
	igoWorker.addEventListener('message', function(e) {event(e.data);});
	igoWorker.addEventListener('error', function() {event({event:'error'});});

	$('#speak').click(function(){
		
		igoWorker.postMessage({method: 'parseNBest', text: getStr($('#text').val()), best: 3});
		return false;
	});
});