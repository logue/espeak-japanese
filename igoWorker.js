importScripts('igo.js', 'unzip.min.js');

var tagger, dataclass = function(){}, data, ret;

addEventListener('message', function(event){
	dataclass.prototype = event.data;
	data = new dataclass();
	ret = {
		method:data.method,
		event: 'result',
		text : data.text,
		morpheme: null
	};

	switch (data.method){
		case 'setdic':
			// キャッシュされているときは解凍処理を実行しない（効果のほどは？）
			if (typeof(tagger) !== 'object') {
				// data.dicにはzipファイルのarraybufferが格納されている
				var files = {}, zip = new Zlib.Unzip(data.dic), category, wdc, unk, mtx;	// imaya氏のunzip.min.jsに変更
				zip.getFilenames().forEach(function(name, i) {
					files[name] = zip.decompress(name);	// この実装は余計なファイルが入っていた場合ロスが多い
				});

				category = new igo.CharCategory(files['code2category'], files['char.category']);
				wdc = new igo.WordDic(files['word2id'], files['word.dat'], files['word.ary.idx'], files['word.inf']);
				unk = new igo.Unknown(category);
				mtx = new igo.Matrix(files['matrix.bin']);
				tagger = new igo.Tagger(wdc, unk, mtx);
			}
			ret.event = 'load';
			break;
		case 'parse':
			ret.morpheme = tagger.parse(data.text);
			break;
		case 'wakati':
			ret.morpheme = tagger.wakati(text);
			break;
		case 'parseNBest':
			ret.morpheme = tagger.parseNBest(data.text, data.best);
			break;
	}

	postMessage(ret);
});
