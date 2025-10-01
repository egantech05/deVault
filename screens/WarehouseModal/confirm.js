import { Alert, Platform } from "react-native";
export function confirmAsync(title, message) {
    if (Platform.OS === "web") return Promise.resolve(window.confirm(`${title}\n\n${message}`));
    return new Promise(res =>
        Alert.alert(title, message, [
            { text: "Cancel", style: "cancel", onPress: () => res(false) },
            { text: "OK", onPress: () => res(true) },
        ])
    );
}
