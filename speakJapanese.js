var igoWorker, speakWorker, PATH = document.querySelector('script[src$="speakJapanese.js"]').getAttribute('src').replace(/speakJapanese.js$/,'');
try {
  igoWorker = new Worker(PATH + 'igoWorker.js');
  speakWorker = new Worker(PATH + 'speakWorker.js');
} catch(e) {
  console.error('warning: no worker support');
}

/* Cross-Browser Web Audio API Playback With Chrome And Callbacks */
// from http://www.masswerk.at/mespeak/

// alias the Web Audio API AudioContext-object
var aliasedAudioContext = window.AudioContext || window.webkitAudioContext;
// ugly user-agent-string sniffing
var isChrome = ((typeof navigator !== 'undefined') && navigator.userAgent &&
	navigator.userAgent.indexOf('Chrome') !== -1);
var chromeVersion = (isChrome)?
	parseInt(
		navigator.userAgent.replace(/^.*?\bChrome\/([0-9]+).*$/, '$1'),
		10
	) : 0;

// set up a BufferSource-node
var audioContext = new aliasedAudioContext();

var source = audioContext.createBufferSource();

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
	
	function playSound(streamBuffer, callback) {
		source.connect(audioContext.destination);
		// since the ended-event isn't generally implemented,
		// we need to use the decodeAudioData()-method in order
		// to extract the duration to be used as a timeout-delay
		audioContext.decodeAudioData(streamBuffer, function(audioData) {
			// detect any implementation of the ended-event
			// Chrome added support for the ended-event lately,
			// but it's unreliable (doesn't fire every time)
			// so let's exclude it.
			if (!isChrome && source.onended !== undefined) {
				// we could also use "source.addEventListener('ended', callback, false)" here
				source.onended = callback;
			} else {
				var duration = audioData.duration;
				// convert to msecs
				// use a default of 1 sec, if we lack a valid duration
				var delay = (duration)? Math.ceil(duration * 1000) : 1000;
				setTimeout(callback, delay);
			}
			// finally assign the buffer
			source.buffer = audioData;
			// start playback for Chrome >= 32
			// please note that this would be without effect on iOS, since we're
			// inside an async callback and iOS requires direct user interaction
			if (chromeVersion >= 32) source.start(0);
		},
		function(error) { /* decoding-error-callback */ });
			// normal start of playback, this would be essentially autoplay
			// but is without any effect in Chrome 32
			// let's exclude Chrome 32 and higher to avoid any double calls anyway
			if (!isChrome || chromeVersion < 32) {
				if (source.start) {
					source.start(0);
				} else {
					source.noteOn(0);
				}
			}
		}

	speakWorker.onmessage = function(event) {
		var wav = event.data,
			buffer=new ArrayBuffer(wav.length);
			new Uint8Array(buffer).set(wav);
		playSound(buffer);
	};

	igoWorker.postMessage({method: 'init', file:PATH + 'unidic.zip'});
	igoWorker.addEventListener('message', function(e) {event(e.data);});
	igoWorker.addEventListener('error', function() {event({event:'error'});});

	$('#speak').click(function(){
		
		igoWorker.postMessage({method: 'parseNBest', text: getStr($('#text').val()), best: 3});
		return false;
	});
});