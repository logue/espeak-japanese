importScripts('igo.min.js', 'unzip.min.js');

var tagger, dataclass = function(){}, data, ret, xhr;

addEventListener("message", function(event){
	dataclass.prototype = event.data;
	data = new dataclass();
	ret = {
		method:data.method,
		event: 'result',
		text : data.text,
		morpheme: null
	};

	switch (data.method){
		case 'init':
			xhr = new XMLHttpRequest();
			xhr.open('GET', data.file ? data.file : 'ipadic.zip' , true);
			xhr.addEventListener('load', function(ev) {
				var input = new Uint8Array(xhr.response),
					zip = new Zlib.Unzip(input),
					files = {},
					category, wdc, unk, mtx;

				postMessage({event:'parsing'});

				zip.getFilenames().forEach(function(name, i) {
					files[name] = zip.decompress(name);	// この実装は余計なファイルが入っていた場合ロスが多い
				});

				category = new igo.CharCategory(files['code2category'], files['char.category']);
				wdc = new igo.WordDic(files['word2id'], files['word.dat'], files['word.ary.idx'], files['word.inf']);
				unk = new igo.Unknown(category);
				mtx = new igo.Matrix(files['matrix.bin']);
				tagger = new igo.Tagger(wdc, unk, mtx);
				postMessage({event:'ready'});
			});
			xhr.addEventListener('progress', function(ev){
				postMessage({event:'loading'});
			}, false);
			xhr.addEventListener('error', function(ev){
				postMessage({event:'error'});
			}, false);
			xhr.responseType = 'arraybuffer';
			xhr.send();
			break;
		case 'parse':
			if (typeof(tagger) !== 'object') throw 'igoWorker: Not initialized';
			ret.morpheme = tagger.parse(data.text);
			break;
		case 'wakati':
			if (typeof(tagger) !== 'object') throw 'igoWorker: Not initialized';
			ret.morpheme = tagger.wakati(text.text);
			break;
		case 'parseNBest':
			if (typeof(tagger) !== 'object') throw 'igoWorker: Not initialized';
			ret.morpheme = tagger.parseNBest(data.text, data.best);
			break;
	}

	postMessage(ret);
});
