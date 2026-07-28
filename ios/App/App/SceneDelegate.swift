import UIKit

class SceneDelegate: UIResponder, UIWindowSceneDelegate {

    var window: UIWindow?

    func scene(
        _ scene: UIScene,
        willConnectTo session: UISceneSession,
        options connectionOptions: UIScene.ConnectionOptions
    ) {
        guard scene is UIWindowScene else {
            return
        }

        // UIKit loads Main.storyboard from the scene configuration. Its initial
        // controller is Capacitor's existing CAPBridgeViewController.
    }
}
