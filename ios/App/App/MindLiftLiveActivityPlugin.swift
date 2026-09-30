import ActivityKit
import Capacitor
import Foundation

@objc(MindLiftLiveActivityPlugin)
class MindLiftLiveActivityPlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "MindLiftLiveActivityPlugin"
    let jsName = "MindLiftLiveActivity"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "update", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "end", returnType: CAPPluginReturnPromise)
    ]

    private var activeActivityId: String?
    private let dateFormatter: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()

    @objc func start(_ call: CAPPluginCall) {
        guard #available(iOS 16.1, *) else {
            reject(call, "MindLift Live Activities require iOS 16.1 or later.")
            return
        }

        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            reject(call, "Live Activities are not enabled for MindLift.")
            return
        }

        guard let workoutTitle = call.getString("workoutTitle"), !workoutTitle.isEmpty else {
            reject(call, "Missing workoutTitle for MindLift Live Activity.")
            return
        }

        do {
            let attributes = MindLiftWorkoutActivityAttributes(workoutTitle: workoutTitle)
            let contentState = try contentState(from: call)
            let activity = try Activity.request(
                attributes: attributes,
                contentState: contentState,
                pushType: nil
            )

            activeActivityId = activity.id
            call.resolve(["activityId": activity.id])
        } catch {
            reject(call, "Failed to start MindLift Live Activity.", error)
        }
    }

    @objc func update(_ call: CAPPluginCall) {
        guard #available(iOS 16.1, *) else {
            reject(call, "MindLift Live Activities require iOS 16.1 or later.")
            return
        }

        guard let activity = activity(for: call) else {
            reject(call, "No active MindLift Live Activity found to update.")
            return
        }

        do {
            let contentState = try contentState(from: call)
            Task {
                await activity.update(using: contentState)
                call.resolve(["activityId": activity.id])
            }
        } catch {
            reject(call, "Failed to update MindLift Live Activity.", error)
        }
    }

    @objc func end(_ call: CAPPluginCall) {
        guard #available(iOS 16.1, *) else {
            reject(call, "MindLift Live Activities require iOS 16.1 or later.")
            return
        }

        guard let activity = activity(for: call) else {
            activeActivityId = nil
            call.resolve(["ended": false])
            return
        }

        let contentState = (try? contentState(from: call, defaultStatus: .completed)) ?? activity.contentState
        Task {
            await activity.end(using: contentState, dismissalPolicy: .immediate)
            if activeActivityId == activity.id {
                activeActivityId = nil
            }
            call.resolve(["activityId": activity.id, "ended": true])
        }
    }

    @available(iOS 16.1, *)
    private func activity(for call: CAPPluginCall) -> Activity<MindLiftWorkoutActivityAttributes>? {
        let requestedId = call.getString("activityId") ?? activeActivityId
        return Activity<MindLiftWorkoutActivityAttributes>.activities.first { activity in
            requestedId == nil || activity.id == requestedId
        }
    }

    @available(iOS 16.1, *)
    private func contentState(
        from call: CAPPluginCall,
        defaultStatus: MindLiftWorkoutActivityStatus = .active
    ) throws -> MindLiftWorkoutActivityAttributes.ContentState {
        let statusValue = call.getString("status") ?? defaultStatus.rawValue
        guard let status = MindLiftWorkoutActivityStatus(rawValue: statusValue) else {
            throw NSError(domain: "MindLiftLiveActivity", code: 1, userInfo: [
                NSLocalizedDescriptionKey: "Unsupported MindLift Live Activity status: \(statusValue)"
            ])
        }

        return MindLiftWorkoutActivityAttributes.ContentState(
            workoutStage: call.getString("workoutStage") ?? "",
            elapsedSeconds: max(0, call.getInt("elapsedSeconds") ?? 0),
            remainingSeconds: max(0, call.getInt("remainingSeconds") ?? 0),
            progress: min(max(call.getDouble("progress") ?? 0, 0), 1),
            timerStartedAt: parseDate(call.getString("timerStartedAt")),
            timerEndsAt: parseDate(call.getString("timerEndsAt")),
            isTimerRunning: call.getBool("isTimerRunning") ?? false,
            status: status
        )
    }

    private func parseDate(_ value: String?) -> Date? {
        guard let value else {
            return nil
        }

        return dateFormatter.date(from: value)
    }

    private func reject(_ call: CAPPluginCall, _ message: String, _ error: Error? = nil) {
        if let error {
            NSLog("[MindLiftLiveActivity] \(message) \(error.localizedDescription)")
            call.reject(message, nil, error)
            return
        }

        NSLog("[MindLiftLiveActivity] \(message)")
        call.reject(message)
    }
}
