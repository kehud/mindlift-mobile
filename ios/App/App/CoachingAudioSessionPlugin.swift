import AVFoundation
import Capacitor

@objc(CoachingAudioSessionPlugin)
class CoachingAudioSessionPlugin: CAPPlugin, CAPBridgedPlugin, AVAudioPlayerDelegate {
    let identifier = "CoachingAudioSessionPlugin"
    let jsName = "CoachingAudioSession"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "play", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pause", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "resume", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise)
    ]

    private var player: AVAudioPlayer?
    private var activeSourceUrl: String?

    @objc func play(_ call: CAPPluginCall) {
        guard let sourceUrl = call.getString("sourceUrl"), !sourceUrl.isEmpty else {
            reject(call, "Missing coaching audio sourceUrl.")
            return
        }

        do {
            stopPlayback(deactivateSession: true)

            let audioUrl = try resolveAudioUrl(sourceUrl)
            try activateAudioSession()

            let nextPlayer = try AVAudioPlayer(contentsOf: audioUrl)
            nextPlayer.delegate = self
            nextPlayer.prepareToPlay()

            guard nextPlayer.play() else {
                deactivateAudioSessionLoggingFailure()
                reject(call, "Failed to start native coaching audio playback for \(sourceUrl).")
                return
            }

            player = nextPlayer
            activeSourceUrl = sourceUrl
            call.resolve()
        } catch {
            deactivateAudioSessionLoggingFailure()
            reject(call, "Failed to play coaching audio clip: \(sourceUrl)", error)
        }
    }

    @objc func pause(_ call: CAPPluginCall) {
        if player?.isPlaying == true {
            player?.pause()
            do {
                try deactivateAudioSession()
            } catch {
                reject(call, "Failed to deactivate audio session while pausing coaching audio.", error)
                return
            }
        }

        call.resolve()
    }

    @objc func resume(_ call: CAPPluginCall) {
        guard let player else {
            call.resolve()
            return
        }

        do {
            try activateAudioSession()

            if !player.play() {
                deactivateAudioSessionLoggingFailure()
                reject(call, "Failed to resume native coaching audio playback.")
                return
            }

            call.resolve()
        } catch {
            deactivateAudioSessionLoggingFailure()
            reject(call, "Failed to resume coaching audio clip.", error)
        }
    }

    @objc func stop(_ call: CAPPluginCall) {
        stopPlayback(deactivateSession: true)
        call.resolve()
    }

    func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        if self.player === player {
            let sourceUrl = activeSourceUrl ?? ""
            stopPlayback(deactivateSession: true)
            notifyListeners("ended", data: [
                "success": flag,
                "sourceUrl": sourceUrl
            ])
        }
    }

    func audioPlayerDecodeErrorDidOccur(_ player: AVAudioPlayer, error: Error?) {
        if self.player === player {
            let sourceUrl = activeSourceUrl ?? ""
            log("Native coaching audio decode error.", error)
            stopPlayback(deactivateSession: true)
            notifyListeners("error", data: [
                "message": error?.localizedDescription ?? "Native coaching audio decode error.",
                "sourceUrl": sourceUrl
            ])
        }
    }

    private func activateAudioSession() throws {
        try AVAudioSession.sharedInstance().setCategory(
            .playback,
            mode: .default,
            options: [.duckOthers, .interruptSpokenAudioAndMixWithOthers]
        )
        try AVAudioSession.sharedInstance().setActive(true)
    }

    private func deactivateAudioSession() throws {
        try AVAudioSession.sharedInstance().setActive(false, options: [.notifyOthersOnDeactivation])
    }

    private func deactivateAudioSessionLoggingFailure() {
        do {
            try deactivateAudioSession()
        } catch {
            log("Failed to deactivate coaching audio session.", error)
        }
    }

    private func stopPlayback(deactivateSession: Bool) {
        player?.delegate = nil
        player?.stop()
        player = nil
        let stoppedSourceUrl = activeSourceUrl
        activeSourceUrl = nil

        if deactivateSession {
            do {
                try deactivateAudioSession()
            } catch {
                log("Failed to deactivate coaching audio session for \(stoppedSourceUrl ?? "unknown source").", error)
            }
        }
    }

    private func resolveAudioUrl(_ sourceUrl: String) throws -> URL {
        if sourceUrl.hasPrefix("http://") || sourceUrl.hasPrefix("https://") {
            throw NSError(domain: "CoachingAudioSession", code: 1, userInfo: [
                NSLocalizedDescriptionKey: "Remote coaching audio is not supported by the native iOS player."
            ])
        }

        let relativePath = sourceUrl.hasPrefix("/") ? String(sourceUrl.dropFirst()) : sourceUrl
        guard let webUrl = URL(string: "res:///\(relativePath)"),
              let audioUrl = bridge?.localURL(fromWebURL: webUrl) else {
            throw NSError(domain: "CoachingAudioSession", code: 2, userInfo: [
                NSLocalizedDescriptionKey: "Coaching audio asset could not be resolved: \(sourceUrl)"
            ])
        }

        guard audioUrl.isFileURL else {
            throw NSError(domain: "CoachingAudioSession", code: 3, userInfo: [
                NSLocalizedDescriptionKey: "Resolved coaching audio URL is not a local file URL: \(audioUrl.absoluteString)"
            ])
        }

        if FileManager.default.fileExists(atPath: audioUrl.path) {
            return audioUrl
        }

        throw NSError(domain: "CoachingAudioSession", code: 2, userInfo: [
            NSLocalizedDescriptionKey: "Coaching audio file not found: \(sourceUrl)"
        ])
    }

    private func reject(_ call: CAPPluginCall, _ message: String, _ error: Error? = nil) {
        log(message, error)
        call.reject(message, nil, error)
    }

    private func log(_ message: String, _ error: Error? = nil) {
        if let error {
            NSLog("[CoachingAudioSession] \(message) \(error.localizedDescription)")
            return
        }

        NSLog("[CoachingAudioSession] \(message)")
    }
}
