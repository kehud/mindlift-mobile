import ActivityKit
import Foundation
import SwiftUI
import WidgetKit

struct MindLiftLiveActivityWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: MindLiftWorkoutActivityAttributes.self) { context in
            MindLiftLiveActivityView(context: context)
                .padding()
                .activityBackgroundTint(liveActivityBackground)
                .activitySystemActionForegroundColor(.white)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    dynamicIslandLeadingView(for: context)
                }

                DynamicIslandExpandedRegion(.trailing) {
                    if context.state.status == .completed {
                        EmptyView()
                    } else {
                        remainingTimeView(for: context.state)
                            .font(.caption)
                            .foregroundStyle(.white)
                    }
                }

                DynamicIslandExpandedRegion(.bottom) {
                    if context.state.status == .completed {
                        dynamicIslandCompletedBottomView(for: context.state)
                    } else {
                        MindLiftProgressBar(state: context.state)
                    }
                }
            } compactLeading: {
                if context.state.status == .completed {
                    completionSymbol(size: 18)
                } else {
                    workoutSymbol(size: 19)
                }
            } compactTrailing: {
                if context.state.status == .completed {
                    Text(compactDurationText(context.state.elapsedSeconds))
                        .font(.caption2)
                        .foregroundStyle(.white)
                        .monospacedDigit()
                } else {
                    compactRemainingTimeView(for: context.state)
                        .font(.caption2)
                        .foregroundStyle(.white)
                }
            } minimal: {
                if context.state.status == .completed {
                    completionSymbol(size: 18)
                } else {
                    workoutSymbol(size: 18)
                }
            }
            .keylineTint(mindLiftAccent)
        }
    }
}

private let mindLiftAccent = Color(red: 169 / 255, green: 84 / 255, blue: 80 / 255)
private let liveActivityBackground = Color.black.opacity(0.92)
private let secondaryText = Color.white.opacity(0.68)
private let progressTrack = Color.white.opacity(0.16)

private struct MindLiftLiveActivityView: View {
    let context: ActivityViewContext<MindLiftWorkoutActivityAttributes>

    var body: some View {
        if context.state.status == .completed {
            completedView
        } else {
            activeView
        }
    }

    private var completedView: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 10) {
                completionSymbol(size: 28)
                Text("Workout Complete")
                    .font(.headline)
                    .foregroundStyle(.white)
                Spacer()
            }

            MindLiftProgressBar(value: 1)

            Text(timeText(context.state.elapsedSeconds))
                .font(.caption2)
                .foregroundStyle(secondaryText)
                .monospacedDigit()
        }
    }

    private var activeView: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .center, spacing: 10) {
                workoutSymbol(size: 28)

                VStack(alignment: .leading, spacing: 2) {
                    Text(context.attributes.workoutTitle)
                        .font(.headline)
                        .foregroundStyle(.white)
                    Text(context.state.workoutStage)
                        .font(.subheadline)
                        .foregroundStyle(mindLiftAccent)
                }
            }

            MindLiftProgressBar(state: context.state)

            HStack(alignment: .center) {
                HStack(spacing: 3) {
                    Text("Elapsed")
                        .foregroundStyle(secondaryText)
                    elapsedTimeView(for: context.state)
                        .foregroundStyle(.white)
                }
                Spacer()
                HStack(spacing: 3) {
                    Text("Remaining")
                        .foregroundStyle(secondaryText)
                    remainingTimeView(for: context.state)
                        .foregroundStyle(.white)
                }
            }
            .font(.caption2)
        }
    }
}

@ViewBuilder
private func compactRemainingTimeView(
    for state: MindLiftWorkoutActivityAttributes.ContentState
) -> some View {
    Text("Workout")
}

@ViewBuilder
private func elapsedTimeView(for state: MindLiftWorkoutActivityAttributes.ContentState) -> some View {
    if state.isTimerRunning, let timerStartedAt = state.timerStartedAt {
        Text(timerStartedAt, style: .timer)
            .monospacedDigit()
    } else {
        Text(timeText(state.elapsedSeconds))
            .monospacedDigit()
    }
}

@ViewBuilder
private func remainingTimeView(for state: MindLiftWorkoutActivityAttributes.ContentState) -> some View {
    if state.isTimerRunning,
       let timerStartedAt = state.timerStartedAt,
       let timerEndsAt = state.timerEndsAt,
       timerStartedAt < timerEndsAt {
        Text(timerInterval: timerStartedAt...timerEndsAt, countsDown: true)
            .monospacedDigit()
    } else {
        Text(timeText(state.remainingSeconds))
            .monospacedDigit()
    }
}

private struct MindLiftProgressBar: View {
    let state: MindLiftWorkoutActivityAttributes.ContentState?
    let value: Double?

    init(state: MindLiftWorkoutActivityAttributes.ContentState) {
        self.state = state
        self.value = nil
    }

    init(value: Double) {
        self.state = nil
        self.value = value
    }

    var body: some View {
        if let state,
           state.isTimerRunning,
           let timerStartedAt = state.timerStartedAt,
           let timerEndsAt = state.timerEndsAt,
           timerStartedAt < timerEndsAt {
            ProgressView(timerInterval: timerStartedAt...timerEndsAt, countsDown: false)
                .tint(mindLiftAccent)
        } else {
            bar(value: value ?? state?.progress ?? 0)
        }
    }

    private func bar(value: Double) -> some View {
        GeometryReader { proxy in
            ZStack(alignment: .leading) {
                Capsule()
                    .fill(progressTrack)
                Capsule()
                    .fill(mindLiftAccent)
                    .frame(width: proxy.size.width * min(max(value, 0), 1))
            }
        }
        .frame(height: 6)
    }

}

@ViewBuilder
private func dynamicIslandLeadingView(for context: ActivityViewContext<MindLiftWorkoutActivityAttributes>) -> some View {
    if context.state.status == .completed {
        HStack(spacing: 8) {
            completionSymbol(size: 24)
            VStack(alignment: .leading, spacing: 2) {
                Text("Workout Complete")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundStyle(.white)
                Text(timeText(context.state.elapsedSeconds))
                    .font(.caption2)
                    .foregroundStyle(secondaryText)
                    .monospacedDigit()
            }
        }
    } else {
        HStack(spacing: 8) {
            workoutSymbol(size: 22)
            VStack(alignment: .leading, spacing: 2) {
                Text(context.attributes.workoutTitle)
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundStyle(.white)
                Text(context.state.workoutStage)
                    .font(.caption2)
                    .foregroundStyle(mindLiftAccent)
            }
        }
    }
}

private func dynamicIslandCompletedBottomView(
    for state: MindLiftWorkoutActivityAttributes.ContentState
) -> some View {
    HStack(alignment: .center, spacing: 10) {
        Text(timeText(state.elapsedSeconds))
            .font(.caption2)
            .foregroundStyle(secondaryText)
            .monospacedDigit()
        MindLiftProgressBar(value: 1)
    }
}

private func workoutSymbol(size: CGFloat) -> some View {
    Image(systemName: "waveform.path.ecg")
        .font(.system(size: size, weight: .semibold))
        .foregroundStyle(mindLiftAccent)
        .symbolEffect(.pulse)
}

private func completionSymbol(size: CGFloat) -> some View {
    Image(systemName: "checkmark.circle")
        .font(.system(size: size, weight: .semibold))
        .foregroundStyle(mindLiftAccent)
}

private func timeText(_ seconds: Int) -> String {
    let minutes = max(0, seconds) / 60
    let remainingSeconds = max(0, seconds) % 60
    return String(format: "%d:%02d", minutes, remainingSeconds)
}

private func compactDurationText(_ seconds: Int) -> String {
    let minutes = max(0, Int(round(Double(seconds) / 60)))

    if minutes >= 1 {
        return "\(minutes)m"
    }

    return "\(max(0, seconds))s"
}
