import ActivityKit
import Foundation

enum MindLiftWorkoutActivityStatus: String, Codable, Hashable {
    case active
    case completed
}

@available(iOS 16.1, *)
struct MindLiftWorkoutActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        let workoutStage: String
        let elapsedSeconds: Int
        let remainingSeconds: Int
        let progress: Double
        let timerStartedAt: Date?
        let timerEndsAt: Date?
        let isTimerRunning: Bool
        let status: MindLiftWorkoutActivityStatus
    }

    let workoutTitle: String
}
