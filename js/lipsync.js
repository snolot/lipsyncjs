window.AudioContext = window.AudioContext || window.webkitAudioContext;
const synthesis = window.speechSynthesis;

const lipsync = _ => {
	const samplingFrequency = 44100;

	const audioCtx = new AudioContext();
	const _voiceBoundingFrequencies = [0, 500, 700, 3000, 6000];
	const _audioSampleCount = {low:256, med:512, high:1024};
	
	let _analyser = audioCtx.createAnalyser();
	let _node;
	let _source = null;
	let _buffer = null;
    let _gainNode = null;
    let _isPlaying = false;
    let _smoothing = 0.25; // range [0,1]
    let _sensitivityThreshold = .43; // range [-.5, .5]
    let _stPSD;
    let _blendShapes;
    let _spectrum;

    let _sampleCount = _audioSampleCount.high;
    let _indicesFrequencyMale = [];

    const _getData = url => {
    	var request = new XMLHttpRequest();

        request.open('GET', url, true);
        request.responseType = 'arraybuffer';

        return new Promise(function (resolve, reject) {
        	request.onload = function() {
            	var audioData = request.response;

            	audioCtx.decodeAudioData(audioData, function(buffer) {
              	console.log('Buffer ready to play.');
              	
              	resolve(buffer);
            },err => {
              	console.log("Error with decoding audio data:" + err);
              	reject(err);
            });
          }

          request.send();
        });
    }

    const _ended = e => {
        console.log('ended');
        _isPlaying = false;
    }

    const getRMS = spectrum => {
		let rms = 0;
	  	for (let i = 0; i < spectrum.length; i++) {
	    	rms += spectrum[i] * spectrum[i];
	  	}
	  	rms /= spectrum.length;
	  	rms = Math.sqrt(rms);
	  	return rms;
	}

	const getstPSD = spectrum => {
		
		const stPSD = new Float32Array(spectrum.length);

		for ( i = 0 ; i< spectrum.length;i++) {
			stPSD[i]= _sensitivityThreshold + ((spectrum[i] +20)/140);	
		}
		
		return stPSD;
 	}

    const _play = _ => {
    	console.log('Buffer play.');
    	_isPlaying = true;

    	for( let m = 0 ; m < _voiceBoundingFrequencies.length ; m++) {
		   _indicesFrequencyMale[m] = Math.round(((2*_sampleCount)/samplingFrequency) *_voiceBoundingFrequencies[m]);
		   //console.log("IndicesFrequencyMale[",m,"]",_indicesFrequencyMale[m]);
		}

    	_analyser.minDecibels = -160;
		_analyser.maxDecibels = -25;
		_analyser.smoothingTimeConstant = _smoothing;
		_analyser.fftSize = _sampleCount;

    	_source = audioCtx.createBufferSource()
        _source.buffer = _buffer;
        _source.connect(_analyser);
        _source.connect(audioCtx.destination);

        _node = audioCtx.createScriptProcessor(_sampleCount*2, 1, 1);
        _analyser.connect(_node);

        _node.onaudioprocess = _ => {
        	_spectrum = new Float32Array(_analyser.frequencyBinCount);
        	_analyser.getFloatFrequencyData(_spectrum);
        	_stPSD = getstPSD(_spectrum);
        	
        	let _blendShapeKiss = 0;
			let _blendShapeLips = 0;
			let _blendShapeMouth = 0;

        	let energyBinMale = new Float32Array(_voiceBoundingFrequencies.length);

        	for ( let m = 0 ; m < _voiceBoundingFrequencies.length -1 ; m++){
				for ( let j = _indicesFrequencyMale[m]; j<= _indicesFrequencyMale[m+1]; j++) {
					if(_stPSD[j] >0){
						energyBinMale[m]+= _stPSD[j] ; 	
					}
				}

				energyBinMale[m] /= (_indicesFrequencyMale[m+1] -_indicesFrequencyMale[m] ); 
			}

			if( energyBinMale[1] > 0.2 ) {
				_blendShapeKiss = 1 -2*energyBinMale[2] ;
			}else{
				_blendShapeKiss = ( 1-2*energyBinMale[2])*5*energyBinMale[1];
			}

			_blendShapeLips = 3*energyBinMale[3];
			_blendShapeMouth = 0.8*(energyBinMale[1]-energyBinMale[3]);

			_blendShapes = {
				blendShapeKiss:_blendShapeKiss,
				blendShapeLips:_blendShapeLips,
				blendShapeMouth:_blendShapeMouth
			}
        }	

        _node.connect(audioCtx.destination);
        _source.start(0);

        _source.onended = _ended;
    }

    const _stop = _ => {
        console.log('stop');
        _source.stop();
    }

	return {
		onStart:async ({url}) => {
        	_buffer = await _getData(url);

           	return _buffer;
        },
        play: _ => {
        	if(_isPlaying) return;
          	_play();
        },
        getBlendShapes: _ => {
        	return _blendShapes;
        },
        isPlaying: _ => {
        	return _isPlaying;
        }
	}
}