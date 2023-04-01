	async function getAudio() {
		let stream: MediaStream

		try {
			stream = await navigator.mediaDevices.getUserMedia({ audio: true })

			mediaRecorder = new MediaRecorder(stream)
			// NOTE Adding a custom property to the MediaRecorder object.
			// There is a 'datavailable' event to listen for.
			mediaRecorder.ondataavailable = (e: BlobEvent) => media.push(e.data)
			// NOTE MediaRecorder has a 'state' prop ('inactive', etc.)
			mediaRecorder.onstop = () => {
				// U: Swap out for global 'player' var
				// const audio = document.querySelector('audio') as HTMLAudioElement
				const blob = new Blob(media, { type: 'audio/ogg; codecs=opus' })
				media = []
				// Q: Which method to use? srcObject or src?
				// audio.srcObject = stream as MediaProvider;
				if (player.srcObject) {
					player.srcObject = stream as MediaProvider
				} else {
					player.src = URL.createObjectURL(blob)
				}

				// NOTE It's here that I'll probably have to sendData(blob) to the
				// server to convert/save to mp3 using ffmpeg. Or, could consider
				// using mic-recorder-to-mp3 package.
				// REF: https://medium.com/jeremy-gottfrieds-tech-blog/javascript-tutorial-record-audio-and-encode-it-to-mp3-2eedcd466e78
				// sendData(blob);
			}
		} catch (err: any) {
			console.log('Error recording audio!', err)
		}
	}

	async function startRecording() {
		await getAudio()
		mediaRecorder.start()
	}

	function stopRecording() {
		mediaRecorder.stop()
	}

	function handleChange(e: any) {
		file = e.target.files[0]
		const url = URL.createObjectURL(file)

		player.src = url
	}

